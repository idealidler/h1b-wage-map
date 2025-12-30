import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. DEBUG: Print key status to terminal (don't print the actual key for security)
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("🔑 Checking API Key:", apiKey ? "Present" : "MISSING");
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server Error: GEMINI_API_KEY is missing in site/.env.local" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { description } = await req.json();
    console.log("📝 Received Description length:", description?.length);

    if (!description) {
      return NextResponse.json({ error: "No description provided" }, { status: 400 });
    }

    // 2. Generate Content
    console.log("🤖 Sending to Gemini...");
    const prompt = `
      You are an expert US Immigration DOL analyst. 
      Analyze the following job description and identify the 1 most likely O*NET SOC Codes (2018 taxonomy).
      Job Description: "${description.slice(0, 1000)}"
      Return ONLY a valid JSON object with this exact structure:
      { "results": [ { "code": "SOC Code", "title": "Title", "match_reason": "Reason" } ] }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Gemini Raw Response:", text.slice(0, 100) + "..."); // Log first 100 chars

    // 3. Clean and Parse
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const json = JSON.parse(cleanedText);

    return NextResponse.json(json);

  } catch (error: any) {
    console.error("❌ API ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}