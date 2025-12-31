import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// CACHE: Load the CSV once when the server starts so we don't read it every request
let cachedSocData: any[] = [];

const loadSocData = () => {
  if (cachedSocData.length > 0) return cachedSocData;

  try {
    // ADJUST THIS PATH to where your CSV actually lives
    // Recommended: Move your csv to "public/data/oes_soc_occs.csv"
    const filePath = path.join(process.cwd(), "data-pipeline", "oes_soc_occs.csv");
    const fileContent = fs.readFileSync(filePath, "utf8");

    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    // Normalize keys to lowercase for safety
    cachedSocData = parsed.data.map((row: any) => ({
      code: row["SOC Code"] || row["soc_code"] || "",
      title: row["Title"] || row["job_title"] || "",
      description: row["Description"] || row["job_description"] || "",
    })).filter(item => item.code && item.description); // Remove bad rows

    console.log(`✅ Loaded ${cachedSocData.length} SOC codes from file.`);
  } catch (error) {
    console.error("⚠️ Failed to load CSV file:", error);
  }
  return cachedSocData;
};

// HELPER: Simple keyword search to find top candidates
const findCandidates = (userText: string, allJobs: any[]) => {
  const userWords = userText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  const scored = allJobs.map(job => {
    let score = 0;
    const jobContent = (job.title + " " + job.description).toLowerCase();
    
    // Simple point system: +1 for every matching word
    userWords.forEach(word => {
      if (jobContent.includes(word)) score++;
    });

    return { ...job, score };
  });

  // Return top 10 matches
  return scored.sort((a, b) => b.score - a.score).slice(0, 10);
};

export async function POST(req: Request) {
  try {
    const { description } = await req.json();
    if (!description) return NextResponse.json({ error: "Required" }, { status: 400 });

    // 1. Load Data & Find Candidates (RAG Step)
    const socData = loadSocData();
    const candidates = findCandidates(description, socData);

    // If file load failed or no matches, we fallback to AI's raw knowledge
    const context = candidates.length > 0 
      ? JSON.stringify(candidates.map(c => ({ 
          code: c.code, 
          title: c.title, 
          official_desc: c.description.slice(0, 200) // Truncate slightly to save tokens
        })))
      : "No official file matches found. Use your internal knowledge.";

    // 2. Ask Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert SOC Analyst.
          
          I will provide a User Job Description and a list of "Official Candidates" from the DOL database.
          Your task is to pick the BEST match from the candidates provided.
          
          If none of the candidates are good, you may use your internal knowledge to pick a better 2018 SOC code.
          
          Output JSON only:
          {
            "results": [
              {
                "code": "SOC Code",
                "title": "Official Title",
                "match_reason": "Explain why this matches the official description."
              }
            ]
          }`
        },
        {
          role: "user",
          content: `User Job: "${description.slice(0, 1000)}"\n\nOfficial Candidates to consider:\n${context}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No response");

    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}