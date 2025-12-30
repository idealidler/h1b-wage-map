import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert US Department of Labor H-1B classification specialist.
      Analyze the following job description and map it to the 3 most likely SOC (Standard Occupational Classification) 2018 codes.
      
      User Job Description:
      "${description}"
      
      Requirements:
      1. Prioritize strict O*NET/SOC 2018 definitions.
      2. Return ONLY valid JSON. No markdown formatting.
      3. The JSON must be an array of objects with these keys: "code" (format XX-XXXX), "title", "match_reason" (1 short sentence why).
      
      Example Output:
      [
        {"code": "15-1252", "title": "Software Developers", "match_reason": "Matches duties of designing and building applications."}
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up potential markdown code blocks if the AI adds them
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return NextResponse.json({ results: JSON.parse(cleanJson) });

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Failed to analyze job" }, { status: 500 });
  }
}