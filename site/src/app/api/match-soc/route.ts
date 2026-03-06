import { NextResponse } from "next/server";
import Groq from "groq-sdk";
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


interface Candidate extends SocJob {
 score: number;
 descriptionScore: number;
 techScore: number;
 priorScore: number;
 confidence: number;
 matchedTerms: string[];
 matchedTechTerms: string[];
 matchedIn: Array<"title" | "description" | "tech_examples">;
}


interface AiResult {
 code: string;
 title: string;
 match_reason: string;
}


const groq = new Groq({
 apiKey: process.env.GROQ_API_KEY,
});


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


let cachedSocData: SocJob[] | null = null;


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


 return (
   TOP_SOC_FILINGS[code] ??
   (baseSoc ? TOP_SOC_FILINGS[baseSoc] : undefined) ??
   0
 );
}


function sponsorshipPrior(job: SocJob): number {
 const filings = lookupFilingsCount(job);
 if (filings <= 0) return 0;
 return Math.log1p(filings) / Math.log1p(MAX_TOP_SOC_FILINGS);
}


function normalizeText(text: string): string {
 return text.toLowerCase().replace(/[^a-z0-9+#.\-\s]/g, " ").replace(/\s+/g, " ").trim();
}


function tokenize(text: string): string[] {
 const normalized = normalizeText(text);
 return Array.from(
   new Set(
     normalized
       .split(" ")
       .map((w) => w.trim())
       .filter((w) => w.length > 2 && !STOPWORDS.has(w))
   )
 );
}


function makeNgrams(tokens: string[], n: number): string[] {
 const grams: string[] = [];
 for (let i = 0; i <= tokens.length - n; i += 1) {
   grams.push(tokens.slice(i, i + n).join(" "));
 }
 return grams;
}


function loadSocData(): SocJob[] {
 if (cachedSocData) return cachedSocData;


 const socDataPath = path.join(process.cwd(), "public", "soc_data.json");
 try {
   const raw = fs.readFileSync(socDataPath, "utf8");
   const parsed = JSON.parse(raw) as unknown;
   const validated = z.array(SocJobSchema).safeParse(parsed);


   if (!validated.success) {
     console.error("[SOC_MATCH_ERROR] Invalid SOC dataset format");
     cachedSocData = [];
     return cachedSocData;
   }


   cachedSocData = validated.data;
   return cachedSocData;
 } catch (error) {
   console.error("[SOC_MATCH_ERROR] Failed to load soc_data.json", error);
   cachedSocData = [];
   return cachedSocData;
 }
}


function pickTechExamplesForContext(
 examples: string[],
 techTokens: string[],
 maxItems = 20
): string[] {
 if (examples.length === 0) return [];


 const normalizedTokens = techTokens.map((t) => normalizeText(t)).filter(Boolean);
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


function scoreCandidate(
 descriptionTokens: string[],
 descriptionBigrams: string[],
 descriptionTrigrams: string[],
 techTokens: string[],
 techBigrams: string[],
 job: SocJob
): Candidate {
 const title = normalizeText(job.title);
 const description = normalizeText(job.description || "");
 const techJoined = normalizeText((job.tech_examples || []).join(" "));
 const titleTokens = new Set(tokenize(job.title));
 const descriptionTokensSet = new Set(tokenize(job.description || ""));
 const techTokensSet = new Set(tokenize((job.tech_examples || []).join(" ")));


 let descriptionScore = 0;
 let techScore = 0;
 const matchedTerms = new Set<string>();
 const matchedTechTerms = new Set<string>();
 const matchedIn = new Set<"title" | "description" | "tech_examples">();


 // Primary signal: user role description should dominate classification.
 for (const token of descriptionTokens) {
   const specificityBoost = Math.min(1.8, 1 + token.length / 10);
   if (title.includes(token)) {
     descriptionScore += 8 * specificityBoost;
     matchedTerms.add(token);
     matchedIn.add("title");
     continue;
   }


   if (description.includes(token)) {
     descriptionScore += 6 * specificityBoost;
     matchedTerms.add(token);
     matchedIn.add("description");
   }
 }


 for (const gram of descriptionBigrams) {
   if (gram.length < 5) continue;
   if (title.includes(gram)) {
     descriptionScore += 9;
     matchedTerms.add(gram);
     matchedIn.add("title");
   } else if (description.includes(gram)) {
     descriptionScore += 7;
     matchedTerms.add(gram);
     matchedIn.add("description");
   }
 }


 for (const gram of descriptionTrigrams) {
   if (gram.length < 8) continue;
   if (title.includes(gram)) {
     descriptionScore += 11;
     matchedTerms.add(gram);
     matchedIn.add("title");
   } else if (description.includes(gram)) {
     descriptionScore += 8;
     matchedTerms.add(gram);
     matchedIn.add("description");
   }
 }


 // Secondary signal: tech stack refines candidates but must not dominate.
 for (const token of techTokens) {
   if (title.includes(token)) {
     techScore += 3;
     matchedTerms.add(token);
     matchedTechTerms.add(token);
     matchedIn.add("title");
   } else if (techJoined.includes(token)) {
     techScore += 4;
     matchedTerms.add(token);
     matchedTechTerms.add(token);
     matchedIn.add("tech_examples");
   }
 }


 for (const gram of techBigrams) {
   if (gram.length < 5) continue;
   if (title.includes(gram)) {
     techScore += 3;
     matchedIn.add("title");
   } else if (techJoined.includes(gram)) {
     techScore += 4;
     matchedIn.add("tech_examples");
   }
 }


 // Coverage bonus from role-description channel only.
 descriptionScore += matchedTerms.size * 1.2;


 // Token-set similarity bonus to reward broad alignment beyond exact phrases.
 const descIntersection = descriptionTokens.filter(
   (t) => titleTokens.has(t) || descriptionTokensSet.has(t)
 ).length;
 const descUnion = new Set([...descriptionTokens, ...titleTokens, ...descriptionTokensSet]).size;
 const descJaccard = descUnion > 0 ? descIntersection / descUnion : 0;
 descriptionScore += descJaccard * 18;


 const techIntersection = techTokens.filter((t) => techTokensSet.has(t) || titleTokens.has(t)).length;
 const techUnion = new Set([...techTokens, ...techTokensSet, ...titleTokens]).size;
 const techJaccard = techUnion > 0 ? techIntersection / techUnion : 0;
 techScore += techJaccard * 8;


 // Hard cap tech contribution to avoid overfitting on tool names.
 const techCap = descriptionScore > 0 ? Math.max(5, Math.floor(descriptionScore * 0.35)) : 3;
 const boundedTechScore = Math.min(techScore, techCap);


 // Sponsorship prior from top-sponsored SOCs. It is bounded and only applied when
 // there is role-description evidence, so popularity never overrides semantics.
 const prior = sponsorshipPrior(job);
 const priorCap = descriptionScore > 0 ? Math.min(8, descriptionScore * 0.18 + 1.5) : 0;
 const priorScore = prior * priorCap;


 const score = descriptionScore + boundedTechScore + priorScore;
 const confidence = score > 0 ? descriptionScore / Math.max(score, 1) : 0;


 return {
   ...job,
   score,
   descriptionScore,
   techScore: boundedTechScore,
   priorScore,
   confidence,
   matchedTerms: Array.from(matchedTerms),
   matchedTechTerms: Array.from(matchedTechTerms),
   matchedIn: Array.from(matchedIn),
 };
}


function findCandidates(userDescription: string, userTechStack: string, allJobs: SocJob[]): Candidate[] {
 const descriptionTokens = tokenize(userDescription);
 const techTokens = tokenize(userTechStack);


 if (descriptionTokens.length === 0 && techTokens.length === 0) {
   return [];
 }


 const descriptionBigrams = makeNgrams(descriptionTokens, 2);
 const descriptionTrigrams = makeNgrams(descriptionTokens, 3);
 const techBigrams = makeNgrams(techTokens, 2);


 const scored = allJobs
   .map((job) =>
     scoreCandidate(
       descriptionTokens,
       descriptionBigrams,
       descriptionTrigrams,
       techTokens,
       techBigrams,
       job
     )
   )
   .filter((job) => job.score > 0);


 return scored
   .sort((a, b) => {
     if (b.score !== a.score) return b.score - a.score;
     if (b.matchedTerms.length !== a.matchedTerms.length) {
       return b.matchedTerms.length - a.matchedTerms.length;
     }
     if (b.descriptionScore !== a.descriptionScore) {
       return b.descriptionScore - a.descriptionScore;
     }
     return a.title.localeCompare(b.title);
   })
   .slice(0, 15);
}


function fallbackResults(candidates: Candidate[]): AiResult[] {
 return candidates.slice(0, 3).map((candidate) => {
   const evidence = candidate.matchedTerms.slice(0, 5).join(", ");
   const techEvidence = candidate.matchedTechTerms.slice(0, 5).join(", ");
   return {
     code: normalizeSocCode(candidate.code),
     title: candidate.title,
     match_reason:
       evidence || techEvidence
         ? `Matched on title/description plus tech stack overlap (${[evidence, techEvidence]
             .filter(Boolean)
             .join("; ")}).`
         : "Closest candidate from title, description, and tech_examples overlap.",
   };
 });
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


export async function POST(req: Request) {
 try {
   const body: unknown = await req.json();
   const parsedBody = RequestSchema.safeParse(body);


   if (!parsedBody.success) {
     return NextResponse.json(
       { error: "Invalid input", details: parsedBody.error.format() },
       { status: 400 }
     );
   }


   const { description, tech_stack } = parsedBody.data;
   const socData = loadSocData();


   if (socData.length === 0) {
     return NextResponse.json(
       { error: "SOC reference data is unavailable. Please try again shortly." },
       { status: 503 }
     );
   }


   const candidates = findCandidates(description, tech_stack, socData);
   if (candidates.length === 0) {
     return NextResponse.json({ results: [] });
   }


   const context = JSON.stringify(
     candidates.map((candidate) => ({
       code: normalizeSocCode(candidate.code),
       title: candidate.title,
       desc: (candidate.description || "").slice(0, 500),
       tech_examples: pickTechExamplesForContext(
         candidate.tech_examples || [],
         tokenize(tech_stack || ""),
         20
       ),
       matched_tech_stack_terms: candidate.matchedTechTerms,
     }))
   );


   if (!process.env.GROQ_API_KEY) {
     return NextResponse.json({ results: fallbackResults(candidates) });
   }


   try {
     const completion = await groq.chat.completions.create({
       model: "llama-3.3-70b-versatile",
       temperature: 0,
       response_format: { type: "json_object" },
       messages: [
         {
           role: "system",
           content: `You are a strict SOC Classification Engine in CLOSED-BOOK mode.


You can only use this evidence from each candidate:
- title
- desc
- tech_examples


Hard Rules:
1) Choose only from Official Candidates.
2) Never use outside knowledge.
3) Never invent or transform code/title.
4) Prioritize semantic/lexical alignment with title + desc first; use tech_examples only as supporting evidence.
5) Compare "User Tech Stack" against each candidate's tech_examples and matched_tech_stack_terms.
6) Return 1 to 3 results sorted by confidence.
7) Return valid JSON only.


Output format:
{"results":[{"code":"exact code from list","title":"exact title from list","match_reason":"concise evidence-based reason"}]}`,
         },
         {
           role: "user",
           content: `User Description:\n${description}\n\nUser Tech Stack:\n${tech_stack || "Not provided"}\n\nOfficial Candidates:\n${context}`,
         },
       ],
     });


     const content = completion.choices[0]?.message?.content;
     if (!content) {
       return NextResponse.json({ results: fallbackResults(candidates) });
     }


     const sanitized = sanitizeModelResults(content, candidates);
     if (sanitized.length > 0) {
       return NextResponse.json({ results: sanitized.slice(0, 3) });
     }


     return NextResponse.json({ results: fallbackResults(candidates) });
   } catch (providerError) {
     console.error("[SOC_MATCH_ERROR] Groq request failed", providerError);
     return NextResponse.json({ results: fallbackResults(candidates) });
   }
 } catch (error) {
   console.error("[SOC_MATCH_ERROR]", error);
   return NextResponse.json(
     { error: "We could not process your request. Please try again." },
     { status: 500 }
   );
 }
}



