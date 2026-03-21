import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import fs from "fs";
import path from "path";

interface SocJob {
  code: string;
  title: string;
  description: string;
  base_soc?: string;
  tech_examples?: string[];
}

type MatchChannel = "title" | "description" | "tech_examples";

interface IndexedSocJob extends SocJob {
  normalizedTitle: string;
  normalizedDescription: string;
  normalizedTech: string;
  titleTokens: string[];
  descriptionTokens: string[];
  techTokens: string[];
  titleTokenCounts: Map<string, number>;
  descriptionTokenCounts: Map<string, number>;
  techTokenCounts: Map<string, number>;
  combinedTokenCounts: Map<string, number>;
  titleSignals: Set<string>;
  descriptionSignals: Set<string>;
  techSignals: Set<string>;
  docLength: number;
  titleLength: number;
  descriptionLength: number;
  techLength: number;
}

interface RetrievalQuery {
  descriptionTokens: string[];
  techTokens: string[];
  expandedDescriptionTokens: string[];
  expandedTechTokens: string[];
  descriptionBigrams: string[];
  descriptionTrigrams: string[];
  techBigrams: string[];
  titleLikePhrases: string[];
  querySignals: Set<string>;
}

interface Candidate extends SocJob {
  score: number;
  retrievalScore: number;
  bm25Score: number;
  phraseScore: number;
  semanticScore: number;
  techScore: number;
  priorScore: number;
  signalScore: number;
  confidence: number;
  matchedTerms: string[];
  matchedTechTerms: string[];
  matchedPhrases: string[];
  matchedSignals: string[];
  matchedIn: MatchChannel[];
}

interface AiResult {
  code: string;
  title: string;
  match_reason: string;
}

interface SocIndex {
  jobs: IndexedSocJob[];
  docFreqs: Map<string, number>;
  titleDocFreqs: Map<string, number>;
  descriptionDocFreqs: Map<string, number>;
  techDocFreqs: Map<string, number>;
  averageDocLength: number;
  averageTitleLength: number;
  averageDescriptionLength: number;
  averageTechLength: number;
}

interface CachedResultEntry {
  results: AiResult[];
  expiresAt: number;
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_LIMIT_BLOCK_MESSAGE =
  "Too many SOC searches from this connection. Please wait a few minutes and try again.";
const RESULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REDIS_RATE_LIMIT_PREFIX = "soc-match:ratelimit";
const REDIS_RESULT_CACHE_PREFIX = "soc-match:cache";

const RequestSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Please add a little more detail so we can match accurately.")
    .max(2000, "Description is too long"),
  tech_stack: z.string().trim().max(600, "Tech stack is too long").optional().default(""),
});

const SocJobSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string().optional().default(""),
  base_soc: z.string().optional(),
  tech_examples: z.array(z.string()).optional().default([]),
});

const AiResultSchema = z.object({
  code: z.string(),
  title: z.string(),
  match_reason: z.string().min(1).max(300),
});

const AiResponseSchema = z.object({
  results: z.array(AiResultSchema).max(5),
});

let cachedSocIndex: SocIndex | null = null;
const requestLog = new Map<string, number[]>();
const resultCache = new Map<string, CachedResultEntry>();
const hasUpstashRedisEnv = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const redis = hasUpstashRedisEnv ? Redis.fromEnv() : null;
const redisRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS, `${RATE_LIMIT_WINDOW_MS / 1000} s`),
      prefix: REDIS_RATE_LIMIT_PREFIX,
      analytics: true,
    })
  : null;

const STOPWORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "from",
  "that",
  "this",
  "have",
  "has",
  "into",
  "your",
  "their",
  "using",
  "use",
  "used",
  "build",
  "work",
  "works",
  "job",
  "role",
]);

const OCCUPATION_EXPANSIONS: Record<string, string[]> = {
  engineer: ["engineering", "developer", "software"],
  developer: ["engineer", "programmer", "software"],
  programmer: ["developer", "software"],
  architect: ["architecture", "systems"],
  scientist: ["analytics", "analysis", "modeling"],
  analyst: ["analysis", "analytics"],
  manager: ["management", "leadership"],
  consultant: ["advisory", "implementation"],
  security: ["cybersecurity", "infosec"],
  data: ["analytics", "database"],
  qa: ["quality", "testing"],
  test: ["testing", "quality"],
  finance: ["financial", "accounting"],
  accounting: ["finance", "financial"],
};

const SIGNAL_GROUPS: Record<string, string[]> = {
  leadership: ["lead", "manager", "management", "director", "head", "chief", "executive", "vp", "vice"],
  seniority_high: ["principal", "staff", "senior", "sr", "lead"],
  seniority_low: ["junior", "jr", "associate", "entry"],
  engineering: ["engineer", "engineering", "developer", "software", "programmer"],
  architecture: ["architect", "architecture"],
  data: ["data", "scientist", "analytics", "analyst", "machine", "ml", "ai", "statistical"],
  security: ["security", "cybersecurity", "infosec", "iam"],
  infrastructure: ["cloud", "devops", "infrastructure", "platform", "sre", "site", "reliability"],
  qa: ["qa", "quality", "test", "testing", "automation"],
  product: ["product", "owner", "roadmap"],
  finance: ["finance", "financial", "accounting", "controller", "treasury"],
  legal: ["legal", "law", "compliance", "attorney"],
  research: ["research", "scientist", "modeling"],
};

const TOP_SOC_FILINGS: Record<string, number> = {
  "15-1252": 545102,
  "15-1132": 131708,
  "15-1299.08": 80452,
  "15-1211": 62675,
  "15-1299.09": 55505,
  "15-1253": 49125,
  "11-3021": 48569,
  "15-2051": 37600,
  "15-1251": 35786,
  "13-2011": 35331,
  "17-2141": 33375,
  "15-2031": 31303,
  "17-2072": 31261,
  "15-2051.01": 27916,
  "17-2071": 23858,
  "13-1111": 23490,
  "15-1133": 23292,
  "13-2051": 23228,
  "15-1121": 22529,
  "13-1161": 17308,
  "17-2112": 17199,
  "15-1242": 17113,
  "19-1042": 17040,
  "17-2051": 16945,
  "15-2041": 16039,
  "15-1199.02": 14110,
  "15-1244": 12890,
  "15-1212": 11280,
  "29-1229": 10538,
  "13-2099.01": 10406,
};

const MAX_TOP_SOC_FILINGS = Math.max(...Object.values(TOP_SOC_FILINGS));

function normalizeSocCode(code: string): string {
  return code.includes(".") ? code : `${code}.00`;
}

function canonicalSoc(code: string): string {
  return code.replace(/\.00$/, "");
}

function lookupFilingsCount(job: SocJob): number {
  const code = canonicalSoc(job.code);
  const baseSoc = job.base_soc ? canonicalSoc(job.base_soc) : "";

  return TOP_SOC_FILINGS[code] ?? (baseSoc ? TOP_SOC_FILINGS[baseSoc] : undefined) ?? 0;
}

function sponsorshipPrior(job: SocJob): number {
  const filings = lookupFilingsCount(job);
  if (filings <= 0) return 0;
  return Math.log1p(filings) / Math.log1p(MAX_TOP_SOC_FILINGS);
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#.\-\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const userAgent = req.headers.get("user-agent")?.trim() || "unknown-agent";
  return `${forwardedFor || realIp || "unknown-ip"}:${userAgent}`;
}

function enforceLocalRateLimit(
  clientId: string
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentRequests = (requestLog.get(clientId) ?? []).filter((timestamp) => timestamp > windowStart);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestRequest = recentRequests[0];
    const retryAfterMs = Math.max(1000, oldestRequest + RATE_LIMIT_WINDOW_MS - now);
    requestLog.set(clientId, recentRequests);
    return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  recentRequests.push(now);
  requestLog.set(clientId, recentRequests);
  return { allowed: true };
}

async function enforceRateLimit(
  clientId: string
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  if (!redisRateLimit) {
    return enforceLocalRateLimit(clientId);
  }

  const result = await redisRateLimit.limit(clientId);
  if (result.success) {
    return { allowed: true };
  }

  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return { allowed: false, retryAfterSec };
}

function buildCacheKey(description: string, techStack: string): string {
  return `${normalizeText(description)}||${normalizeText(techStack)}`;
}

function getLocalCachedResult(cacheKey: string): AiResult[] | null {
  const entry = resultCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    resultCache.delete(cacheKey);
    return null;
  }
  return entry.results;
}

function setLocalCachedResult(cacheKey: string, results: AiResult[]): void {
  resultCache.set(cacheKey, {
    results,
    expiresAt: Date.now() + RESULT_CACHE_TTL_MS,
  });
}

async function getCachedResult(cacheKey: string): Promise<AiResult[] | null> {
  if (!redis) {
    return getLocalCachedResult(cacheKey);
  }

  const cached = await redis.get<string>(`${REDIS_RESULT_CACHE_PREFIX}:${cacheKey}`);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as unknown;
    const validated = z.array(AiResultSchema).safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

async function setCachedResult(cacheKey: string, results: AiResult[]): Promise<void> {
  if (!redis) {
    setLocalCachedResult(cacheKey, results);
    return;
  }

  await redis.set(`${REDIS_RESULT_CACHE_PREFIX}:${cacheKey}`, JSON.stringify(results), {
    ex: Math.ceil(RESULT_CACHE_TTL_MS / 1000),
  });
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((word) => word.trim())
        .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    )
  );
}

function countTokens(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function mergeCounts(...maps: Map<string, number>[]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const map of maps) {
    for (const [key, value] of map.entries()) {
      merged.set(key, (merged.get(key) ?? 0) + value);
    }
  }
  return merged;
}

function makeNgrams(tokens: string[], n: number): string[] {
  const grams: string[] = [];
  for (let index = 0; index <= tokens.length - n; index += 1) {
    grams.push(tokens.slice(index, index + n).join(" "));
  }
  return Array.from(new Set(grams));
}

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const related = OCCUPATION_EXPANSIONS[token];
    if (!related) continue;
    for (const value of related) {
      expanded.add(value);
    }
  }
  return Array.from(expanded);
}

function extractSignals(text: string): Set<string> {
  const tokens = new Set(tokenize(text));
  const signals = new Set<string>();
  for (const [signal, keywords] of Object.entries(SIGNAL_GROUPS)) {
    if (keywords.some((keyword) => tokens.has(keyword) || normalizeText(text).includes(keyword))) {
      signals.add(signal);
    }
  }
  return signals;
}

function buildDocumentFrequencies(tokenSets: Set<string>[]): Map<string, number> {
  const docFreqs = new Map<string, number>();
  for (const tokenSet of tokenSets) {
    for (const token of tokenSet) {
      docFreqs.set(token, (docFreqs.get(token) ?? 0) + 1);
    }
  }
  return docFreqs;
}

function createIndexedJob(job: SocJob): IndexedSocJob {
  const normalizedTitle = normalizeText(job.title);
  const normalizedDescription = normalizeText(job.description || "");
  const normalizedTech = normalizeText((job.tech_examples || []).join(" "));
  const titleTokens = tokenize(job.title);
  const descriptionTokens = tokenize(job.description || "");
  const techTokens = tokenize((job.tech_examples || []).join(" "));
  const titleTokenCounts = countTokens(titleTokens);
  const descriptionTokenCounts = countTokens(descriptionTokens);
  const techTokenCounts = countTokens(techTokens);

  return {
    ...job,
    normalizedTitle,
    normalizedDescription,
    normalizedTech,
    titleTokens,
    descriptionTokens,
    techTokens,
    titleTokenCounts,
    descriptionTokenCounts,
    techTokenCounts,
    combinedTokenCounts: mergeCounts(titleTokenCounts, descriptionTokenCounts, techTokenCounts),
    titleSignals: extractSignals(job.title),
    descriptionSignals: extractSignals(job.description || ""),
    techSignals: extractSignals((job.tech_examples || []).join(" ")),
    docLength: Math.max(1, titleTokens.length + descriptionTokens.length + techTokens.length),
    titleLength: Math.max(1, titleTokens.length),
    descriptionLength: Math.max(1, descriptionTokens.length),
    techLength: Math.max(1, techTokens.length),
  };
}

function loadSocIndex(): SocIndex {
  if (cachedSocIndex) return cachedSocIndex;

  const socDataPath = path.join(process.cwd(), "public", "soc_data.json");
  try {
    const raw = fs.readFileSync(socDataPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const validated = z.array(SocJobSchema).safeParse(parsed);

    if (!validated.success) {
      console.error("[SOC_MATCH_ERROR] Invalid SOC dataset format");
      cachedSocIndex = {
        jobs: [],
        docFreqs: new Map(),
        titleDocFreqs: new Map(),
        descriptionDocFreqs: new Map(),
        techDocFreqs: new Map(),
        averageDocLength: 1,
        averageTitleLength: 1,
        averageDescriptionLength: 1,
        averageTechLength: 1,
      };
      return cachedSocIndex;
    }

    const jobs = validated.data.map(createIndexedJob);
    const averageDocLength =
      jobs.reduce((total, job) => total + job.docLength, 0) / Math.max(jobs.length, 1);
    const averageTitleLength =
      jobs.reduce((total, job) => total + job.titleLength, 0) / Math.max(jobs.length, 1);
    const averageDescriptionLength =
      jobs.reduce((total, job) => total + job.descriptionLength, 0) / Math.max(jobs.length, 1);
    const averageTechLength =
      jobs.reduce((total, job) => total + job.techLength, 0) / Math.max(jobs.length, 1);

    cachedSocIndex = {
      jobs,
      docFreqs: buildDocumentFrequencies(jobs.map((job) => new Set(job.combinedTokenCounts.keys()))),
      titleDocFreqs: buildDocumentFrequencies(jobs.map((job) => new Set(job.titleTokenCounts.keys()))),
      descriptionDocFreqs: buildDocumentFrequencies(
        jobs.map((job) => new Set(job.descriptionTokenCounts.keys()))
      ),
      techDocFreqs: buildDocumentFrequencies(jobs.map((job) => new Set(job.techTokenCounts.keys()))),
      averageDocLength,
      averageTitleLength,
      averageDescriptionLength,
      averageTechLength,
    };
    return cachedSocIndex;
  } catch (error) {
    console.error("[SOC_MATCH_ERROR] Failed to load soc_data.json", error);
    cachedSocIndex = {
      jobs: [],
      docFreqs: new Map(),
      titleDocFreqs: new Map(),
      descriptionDocFreqs: new Map(),
      techDocFreqs: new Map(),
      averageDocLength: 1,
      averageTitleLength: 1,
      averageDescriptionLength: 1,
      averageTechLength: 1,
    };
    return cachedSocIndex;
  }
}

function pickTechExamplesForContext(examples: string[], techTokens: string[], maxItems = 20): string[] {
  if (examples.length === 0) return [];

  const normalizedTokens = techTokens.map((token) => normalizeText(token)).filter(Boolean);
  if (normalizedTokens.length === 0) return examples.slice(0, maxItems);

  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const example of examples) {
    const normalizedExample = normalizeText(example);
    if (normalizedTokens.some((token) => normalizedExample.includes(token))) {
      matched.push(example);
    } else {
      unmatched.push(example);
    }
  }

  return [...matched, ...unmatched].slice(0, maxItems);
}

function bm25TermScore(
  term: string,
  termCounts: Map<string, number>,
  docLength: number,
  averageDocLength: number,
  docFreqs: Map<string, number>,
  totalDocs: number
): number {
  const tf = termCounts.get(term) ?? 0;
  if (tf === 0) return 0;

  const k1 = 1.2;
  const b = 0.75;
  const df = docFreqs.get(term) ?? 0;
  const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));

  return idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / Math.max(averageDocLength, 1)))));
}

function bm25Score(
  terms: string[],
  termCounts: Map<string, number>,
  docLength: number,
  averageDocLength: number,
  docFreqs: Map<string, number>,
  totalDocs: number
): number {
  return terms.reduce(
    (score, term) =>
      score + bm25TermScore(term, termCounts, docLength, averageDocLength, docFreqs, totalDocs),
    0
  );
}

function countPhraseHits(text: string, phrases: string[], weight: number): number {
  let score = 0;
  for (const phrase of phrases) {
    if (phrase.length < 5) continue;
    if (text.includes(phrase)) score += weight;
  }
  return score;
}

function jaccardScore(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = left.filter((term) => rightSet.has(term)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union > 0 ? intersection / union : 0;
}

function signalAlignmentScore(querySignals: Set<string>, job: IndexedSocJob): { score: number; matched: string[] } {
  const jobSignals = new Set([
    ...job.titleSignals,
    ...job.descriptionSignals,
    ...job.techSignals,
  ]);
  const matched = Array.from(querySignals).filter((signal) => jobSignals.has(signal));

  let score = matched.length * 1.5;
  if (querySignals.has("leadership") && !jobSignals.has("leadership")) score -= 0.75;
  if (querySignals.has("seniority_high") && !jobSignals.has("seniority_high")) score -= 0.5;
  if (querySignals.has("seniority_low") && jobSignals.has("seniority_high")) score -= 0.4;

  return { score: Math.max(score, 0), matched };
}

function buildQuery(userDescription: string, userTechStack: string): RetrievalQuery {
  const descriptionTokens = tokenize(userDescription);
  const techTokens = tokenize(userTechStack);
  const expandedDescriptionTokens = expandTokens(descriptionTokens);
  const expandedTechTokens = expandTokens(techTokens);
  const descriptionBigrams = makeNgrams(descriptionTokens, 2);
  const descriptionTrigrams = makeNgrams(descriptionTokens, 3);
  const techBigrams = makeNgrams(techTokens, 2);
  const titleLikePhrases = [
    ...descriptionBigrams.filter((phrase) => phrase.split(" ").length === 2),
    ...descriptionTrigrams,
  ].slice(0, 20);

  return {
    descriptionTokens,
    techTokens,
    expandedDescriptionTokens,
    expandedTechTokens,
    descriptionBigrams,
    descriptionTrigrams,
    techBigrams,
    titleLikePhrases,
    querySignals: extractSignals(`${userDescription} ${userTechStack}`),
  };
}

function scoreCandidate(query: RetrievalQuery, job: IndexedSocJob, index: SocIndex): Candidate {
  const totalDocs = Math.max(index.jobs.length, 1);
  const matchedTerms = new Set<string>();
  const matchedTechTerms = new Set<string>();
  const matchedPhrases = new Set<string>();
  const matchedIn = new Set<MatchChannel>();

  for (const term of query.expandedDescriptionTokens) {
    if (job.normalizedTitle.includes(term)) {
      matchedTerms.add(term);
      matchedIn.add("title");
    }
    if (job.normalizedDescription.includes(term)) {
      matchedTerms.add(term);
      matchedIn.add("description");
    }
  }

  for (const term of query.expandedTechTokens) {
    if (job.normalizedTitle.includes(term)) matchedIn.add("title");
    if (job.normalizedTech.includes(term)) {
      matchedTechTerms.add(term);
      matchedIn.add("tech_examples");
    }
  }

  for (const phrase of [...query.descriptionBigrams, ...query.descriptionTrigrams, ...query.techBigrams]) {
    if (job.normalizedTitle.includes(phrase) || job.normalizedDescription.includes(phrase)) {
      matchedPhrases.add(phrase);
    }
  }

  const titleBm25 = bm25Score(
    query.expandedDescriptionTokens,
    job.titleTokenCounts,
    job.titleLength,
    index.averageTitleLength,
    index.titleDocFreqs,
    totalDocs
  );
  const descriptionBm25 = bm25Score(
    query.expandedDescriptionTokens,
    job.descriptionTokenCounts,
    job.descriptionLength,
    index.averageDescriptionLength,
    index.descriptionDocFreqs,
    totalDocs
  );
  const combinedBm25 = bm25Score(
    query.expandedDescriptionTokens,
    job.combinedTokenCounts,
    job.docLength,
    index.averageDocLength,
    index.docFreqs,
    totalDocs
  );
  const techBm25 = bm25Score(
    query.expandedTechTokens,
    job.techTokenCounts,
    job.techLength,
    index.averageTechLength,
    index.techDocFreqs,
    totalDocs
  );
  const titleTechBm25 = bm25Score(
    query.expandedTechTokens,
    job.titleTokenCounts,
    job.titleLength,
    index.averageTitleLength,
    index.titleDocFreqs,
    totalDocs
  );

  const bm25RetrievalScore = titleBm25 * 3.4 + descriptionBm25 * 2.4 + combinedBm25 * 1.6;

  const phraseScore =
    countPhraseHits(job.normalizedTitle, query.descriptionTrigrams, 9) +
    countPhraseHits(job.normalizedTitle, query.descriptionBigrams, 7) +
    countPhraseHits(job.normalizedDescription, query.descriptionTrigrams, 6) +
    countPhraseHits(job.normalizedDescription, query.descriptionBigrams, 4) +
    countPhraseHits(job.normalizedTitle, query.titleLikePhrases, 4);

  const semanticScore =
    jaccardScore(query.expandedDescriptionTokens, job.titleTokens) * 18 +
    jaccardScore(query.expandedDescriptionTokens, job.descriptionTokens) * 15;

  const rawTechScore = techBm25 * 2.2 + titleTechBm25 * 1.5 + jaccardScore(query.expandedTechTokens, job.techTokens) * 8;
  const signalMatch = signalAlignmentScore(query.querySignals, job);

  const retrievalWithoutPrior = bm25RetrievalScore + phraseScore + semanticScore + signalMatch.score;
  const techCap = retrievalWithoutPrior > 0 ? Math.max(6, retrievalWithoutPrior * 0.28) : 4;
  const boundedTechScore = Math.min(rawTechScore, techCap);

  const prior = sponsorshipPrior(job);
  const priorCap = retrievalWithoutPrior > 0 ? Math.min(8, retrievalWithoutPrior * 0.12 + 1.5) : 0;
  const priorScore = prior * priorCap;

  const coverageBonus = matchedTerms.size * 1.15 + matchedPhrases.size * 1.8 + matchedTechTerms.size * 0.9;
  const retrievalScore = retrievalWithoutPrior + coverageBonus;
  const score = retrievalScore + boundedTechScore + priorScore;
  const confidenceBase = retrievalScore / Math.max(score, 1);
  const confidence = Math.max(
    0,
    Math.min(1, confidenceBase + Math.min(0.18, matchedPhrases.size * 0.03 + signalMatch.matched.length * 0.02))
  );

  return {
    code: job.code,
    title: job.title,
    description: job.description,
    base_soc: job.base_soc,
    tech_examples: job.tech_examples,
    score,
    retrievalScore,
    bm25Score: bm25RetrievalScore,
    phraseScore,
    semanticScore,
    techScore: boundedTechScore,
    priorScore,
    signalScore: signalMatch.score,
    confidence,
    matchedTerms: Array.from(matchedTerms).slice(0, 8),
    matchedTechTerms: Array.from(matchedTechTerms).slice(0, 8),
    matchedPhrases: Array.from(matchedPhrases).slice(0, 6),
    matchedSignals: signalMatch.matched,
    matchedIn: Array.from(matchedIn),
  };
}

function diversifyCandidates(candidates: Candidate[], maxResults = 15): Candidate[] {
  const selected: Candidate[] = [];
  const baseSocCounts = new Map<string, number>();
  const titleCounts = new Map<string, number>();

  for (const candidate of candidates) {
    const baseSoc = canonicalSoc(candidate.base_soc || candidate.code);
    const titleKey = candidate.title.toLowerCase();
    const baseCount = baseSocCounts.get(baseSoc) ?? 0;
    const titleCount = titleCounts.get(titleKey) ?? 0;

    if (baseCount >= 3 || titleCount >= 1) {
      continue;
    }

    selected.push(candidate);
    baseSocCounts.set(baseSoc, baseCount + 1);
    titleCounts.set(titleKey, titleCount + 1);

    if (selected.length >= maxResults) break;
  }

  if (selected.length >= Math.min(maxResults, candidates.length)) return selected;

  for (const candidate of candidates) {
    const alreadyIncluded = selected.some(
      (selectedCandidate) =>
        selectedCandidate.code === candidate.code && selectedCandidate.title === candidate.title
    );
    if (alreadyIncluded) continue;
    selected.push(candidate);
    if (selected.length >= maxResults) break;
  }

  return selected;
}

function findCandidates(userDescription: string, userTechStack: string, index: SocIndex): Candidate[] {
  const query = buildQuery(userDescription, userTechStack);
  if (query.descriptionTokens.length === 0 && query.techTokens.length === 0) {
    return [];
  }

  return diversifyCandidates(
    index.jobs
      .map((job) => scoreCandidate(query, job, index))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (right.retrievalScore !== left.retrievalScore) return right.retrievalScore - left.retrievalScore;
        if (right.confidence !== left.confidence) return right.confidence - left.confidence;
        if (right.matchedPhrases.length !== left.matchedPhrases.length) {
          return right.matchedPhrases.length - left.matchedPhrases.length;
        }
        return left.title.localeCompare(right.title);
      })
  );
}

function formatCandidateEvidence(candidate: Candidate): string {
  const evidence: string[] = [];
  if (candidate.matchedPhrases.length > 0) {
    evidence.push(`phrase overlap: ${candidate.matchedPhrases.slice(0, 3).join(", ")}`);
  }
  if (candidate.matchedTerms.length > 0) {
    evidence.push(`role terms: ${candidate.matchedTerms.slice(0, 4).join(", ")}`);
  }
  if (candidate.matchedTechTerms.length > 0) {
    evidence.push(`tech overlap: ${candidate.matchedTechTerms.slice(0, 4).join(", ")}`);
  }
  if (candidate.matchedSignals.length > 0) {
    evidence.push(`role signals: ${candidate.matchedSignals.slice(0, 3).join(", ")}`);
  }
  return evidence.join("; ");
}

function fallbackResults(candidates: Candidate[]): AiResult[] {
  return candidates.slice(0, 3).map((candidate) => ({
    code: normalizeSocCode(candidate.code),
    title: candidate.title,
    match_reason:
      formatCandidateEvidence(candidate) ||
      "Closest candidate from title, description, tech examples, and role-level alignment.",
  }));
}

function shouldUseOpenAi(candidates: Candidate[]): boolean {
  if (!process.env.OPENAI_API_KEY) return false;
  if (candidates.length === 0) return false;
  if (candidates.length === 1) return false;

  const topCandidate = candidates[0];
  const runnerUp = candidates[1];
  const scoreGap = topCandidate.score - runnerUp.score;
  const scoreRatio = runnerUp.score > 0 ? topCandidate.score / runnerUp.score : Number.POSITIVE_INFINITY;
  const strongDeterministicMatch =
    topCandidate.confidence >= 0.82 &&
    scoreGap >= 8 &&
    scoreRatio >= 1.22 &&
    (topCandidate.matchedPhrases.length >= 1 || topCandidate.matchedTerms.length >= 5);

  return !strongDeterministicMatch;
}

function sanitizeModelResults(rawContent: string, candidates: Candidate[]): AiResult[] {
  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(rawContent);
  } catch {
    return [];
  }

  const parsed = AiResponseSchema.safeParse(parsedRaw);
  if (!parsed.success) return [];

  const candidateByCode = new Map<string, Candidate>();
  const candidateByTitle = new Map<string, Candidate>();
  candidates.forEach((candidate) => {
    candidateByCode.set(normalizeSocCode(candidate.code), candidate);
    candidateByTitle.set(candidate.title.toLowerCase(), candidate);
  });

  const cleaned: AiResult[] = [];
  for (const result of parsed.data.results) {
    const normalizedCode = normalizeSocCode(result.code);
    const byCode = candidateByCode.get(normalizedCode);
    const byTitle = candidateByTitle.get(result.title.toLowerCase());
    const matched = byCode ?? byTitle;
    if (!matched) continue;

    cleaned.push({
      code: normalizeSocCode(matched.code),
      title: matched.title,
      match_reason: result.match_reason.trim(),
    });
  }

  const seen = new Set<string>();
  return cleaned.filter((result) => {
    const key = `${result.code}-${result.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function requestOpenAiResults(
  description: string,
  techStack: string,
  context: string
): Promise<string | null> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      max_tokens: 220,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a strict SOC Classification Engine in CLOSED-BOOK mode.

You can only use this evidence from each candidate:
- title
- desc
- tech_examples
- retrieval evidence
- retrieval scores

Hard Rules:
1) Choose only from Official Candidates.
2) Never use outside knowledge.
3) Never invent or transform code/title.
4) Prioritize actual job function and scope over tool mentions.
5) Treat tech_examples as supporting evidence, not primary evidence.
6) Prefer candidates with stronger phrase overlap, role-term overlap, and seniority/function alignment.
7) Return 1 to 3 results sorted by confidence.
8) Return valid JSON only.

Output format:
{"results":[{"code":"exact code from list","title":"exact title from list","match_reason":"concise evidence-based reason"}]}`,
        },
        {
          role: "user",
          content: `User Description:\n${description}\n\nUser Tech Stack:\n${techStack || "Not provided"}\n\nOfficial Candidates:\n${context}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed with status ${response.status}: ${errorText}`);
  }

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("choices" in data) ||
    !Array.isArray((data as { choices?: unknown }).choices)
  ) {
    return null;
  }

  const firstChoice = (data as { choices: Array<{ message?: { content?: unknown } }> }).choices[0];
  return typeof firstChoice?.message?.content === "string" ? firstChoice.message.content : null;
}

export async function POST(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rateLimit = await enforceRateLimit(clientId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: RATE_LIMIT_BLOCK_MESSAGE },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        }
      );
    }

    const body: unknown = await req.json();
    const parsedBody = RequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsedBody.error.format() },
        { status: 400 }
      );
    }

    const { description, tech_stack } = parsedBody.data;
    const cacheKey = buildCacheKey(description, tech_stack);
    const cachedResults = await getCachedResult(cacheKey);
    if (cachedResults) {
      return NextResponse.json({ results: cachedResults });
    }

    const socIndex = loadSocIndex();

    if (socIndex.jobs.length === 0) {
      return NextResponse.json(
        { error: "SOC reference data is unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    const candidates = findCandidates(description, tech_stack, socIndex);
    if (candidates.length === 0) {
      await setCachedResult(cacheKey, []);
      return NextResponse.json({ results: [] });
    }

    const localResults = fallbackResults(candidates);

    const context = JSON.stringify(
      candidates.map((candidate) => ({
        code: normalizeSocCode(candidate.code),
        title: candidate.title,
        desc: (candidate.description || "").slice(0, 500),
        tech_examples: pickTechExamplesForContext(candidate.tech_examples || [], tokenize(tech_stack), 20),
        retrieval: {
          total_score: Number(candidate.score.toFixed(2)),
          retrieval_score: Number(candidate.retrievalScore.toFixed(2)),
          bm25_score: Number(candidate.bm25Score.toFixed(2)),
          phrase_score: Number(candidate.phraseScore.toFixed(2)),
          semantic_score: Number(candidate.semanticScore.toFixed(2)),
          tech_score: Number(candidate.techScore.toFixed(2)),
          signal_score: Number(candidate.signalScore.toFixed(2)),
          prior_score: Number(candidate.priorScore.toFixed(2)),
          confidence: Number(candidate.confidence.toFixed(2)),
        },
        evidence: {
          matched_terms: candidate.matchedTerms,
          matched_phrases: candidate.matchedPhrases,
          matched_tech_terms: candidate.matchedTechTerms,
          matched_signals: candidate.matchedSignals,
          matched_in: candidate.matchedIn,
        },
      }))
    );

    if (!shouldUseOpenAi(candidates)) {
      await setCachedResult(cacheKey, localResults);
      return NextResponse.json({ results: localResults });
    }

    try {
      const content = await requestOpenAiResults(description, tech_stack, context);
      if (!content) {
        await setCachedResult(cacheKey, localResults);
        return NextResponse.json({ results: localResults });
      }

      const sanitized = sanitizeModelResults(content, candidates);
      if (sanitized.length > 0) {
        const finalResults = sanitized.slice(0, 3);
        await setCachedResult(cacheKey, finalResults);
        return NextResponse.json({ results: finalResults });
      }

      await setCachedResult(cacheKey, localResults);
      return NextResponse.json({ results: localResults });
    } catch (providerError) {
      console.error("[SOC_MATCH_ERROR] OpenAI request failed", providerError);
      await setCachedResult(cacheKey, localResults);
      return NextResponse.json({ results: localResults });
    }
  } catch (error) {
    console.error("[SOC_MATCH_ERROR]", error);
    return NextResponse.json(
      { error: "We could not process your request. Please try again." },
      { status: 500 }
    );
  }
}
