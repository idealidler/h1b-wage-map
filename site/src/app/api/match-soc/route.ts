import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

let cachedSocData: any[] = [];

const loadSocData = () => {
  if (cachedSocData.length > 0) return cachedSocData;

  try {
    // 1. FIX PATH: Points to 'site/data/oes_soc_occs.csv'
    const filePath = path.join(process.cwd(), "data", "oes_soc_occs.csv");
    
    if (!fs.existsSync(filePath)) {
        console.error("❌ CRITICAL: CSV File not found at:", filePath);
        return [];
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    // 2. FIX HEADERS: Matches your specific CSV format (soccode, Title, Description)
    cachedSocData = parsed.data.map((row: any) => ({
      code: row["soccode"] || row["SOC Code"] || "",
      title: row["Title"] || row["title"] || "",
      description: row["Description"] || row["description"] || "",
    })).filter(item => item.code && item.description); 

    console.log(`✅ Successfully loaded ${cachedSocData.length} SOC codes.`);
  } catch (error) {
    console.error("⚠️ Failed to load CSV file:", error);
  }
  return cachedSocData;
};

const findCandidates = (userText: string, allJobs: any[]) => {
  const userWords = userText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  const scored = allJobs.map(job => {
    let score = 0;
    const titleLower = job.title.toLowerCase();
    const descLower = job.description.toLowerCase();
    
    userWords.forEach(word => {
      // Weight Titles higher than descriptions
      if (titleLower.includes(word)) score += 3;
      else if (descLower.includes(word)) score += 1;
    });

    return { ...job, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 15);
};

export async function POST(req: Request) {
  try {
    const { description } = await req.json();
    if (!description) return NextResponse.json({ error: "Required" }, { status: 400 });

    const socData = loadSocData();
    
    // 3. REMOVE FALLBACK: If DB is empty, STOP. Do not let AI guess.
    if (socData.length === 0) {
        return NextResponse.json({ 
            error: "Server Error: SOC Database could not be loaded. Please check server logs." 
        }, { status: 500 });
    }

    const candidates = findCandidates(description, socData);

    if (candidates.length === 0 || candidates[0].score === 0) {
        return NextResponse.json({ results: [] }); 
    }

    const context = JSON.stringify(candidates.map(c => ({ 
        code: c.code, 
        title: c.title, 
        desc: c.description.slice(0, 300) 
    })));

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a strict SOC Classification Engine.
          
          RULES:
          1. You must ONLY select codes from the "Official Candidates" list provided below.
          2. DO NOT hallucinate. DO NOT use your internal training data.
          3. Output valid JSON.

          Output Format:
          {
            "results": [
              {
                "code": "EXACT CODE FROM LIST",
                "title": "EXACT TITLE FROM LIST",
                "match_reason": "Brief explanation."
              }
            ]
          }`
        },
        {
          role: "user",
          content: `User Job Description: "${description.slice(0, 1500)}"\n\nOfficial Candidates (YOU MUST PICK FROM THIS LIST):\n${context}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0, 
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