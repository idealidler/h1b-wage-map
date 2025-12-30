"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Search, ChevronRight, Info, AlertTriangle, Bot, FileText, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function FindSocPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/match-soc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: input }),
      });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (code: string, title: string) => {
    router.push(`/?soc=${code}&title=${encodeURIComponent(title)}`);
  };

  return (
    <main className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
      
      {/* 1. TOP NAVIGATION BAR */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <Link 
                href="/" 
                className="p-2 -ml-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all"
                title="Back to Map"
            >
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-1.5 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-700" />
                </div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                    AI Job Classifier
                </h1>
            </div>
          </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 w-full space-y-8 flex-grow">
        
        {/* 2. HERO SECTION */}
        <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Find Your Official <span className="text-blue-700">SOC Code</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                Don't guess. Paste your resume, job description, or daily duties below to match with the official Department of Labor classification.
            </p>
        </div>

        {/* --- NEW ADDITION: API LIMIT DISCLAIMER --- */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
                <p className="font-bold mb-1">Trial API Limit Notice</p>
                <p className="leading-relaxed text-amber-800/90">
                    This tool runs on a trial API with strict daily limits. If results fail to load, the limit has likely been reached. 
                    Please try <a href="https://chatgpt.com" target="_blank" className="underline font-semibold hover:text-amber-950">ChatGPT</a> or 
                    <a href="https://gemini.google.com" target="_blank" className="underline font-semibold hover:text-amber-950 ml-1">Gemini</a> directly 
                    to find your SOC code.
                </p>
            </div>
        </div>
        {/* ------------------------------------------ */}

        {/* 3. INPUT CARD */}
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="relative">
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full h-56 p-6 resize-none focus:outline-none text-gray-900 text-base leading-relaxed placeholder-gray-400"
                    placeholder="Paste your job description here... 
                    
Example: 'I develop web applications using React and Node.js. I deploy to AWS, manage CI/CD pipelines, and collaborate with designers to implement UI features.'"
                />
                {/* Character Count / Model Badge */}
                <div className="absolute bottom-4 right-6 flex items-center gap-2">
                     <span className="text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Gemini 2.5 Flash
                     </span>
                </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Privacy: Your text is not stored.</span>
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={loading || !input.trim()}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-sm flex items-center gap-2
                        ${loading || !input.trim() 
                            ? "bg-gray-300 cursor-not-allowed" 
                            : "bg-blue-700 hover:bg-blue-800 hover:shadow-md hover:-translate-y-0.5"
                        }
                    `}
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" /> Match Job Title
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* 4. RESULTS SECTION */}
        {results.length > 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Top Matches Found</span>
                    <div className="h-px flex-1 bg-gray-200"></div>
                </div>

                <div className="grid gap-4">
                    {results.map((job, idx) => (
                        <div 
                            key={idx}
                            onClick={() => handleSelect(job.code, job.title)}
                            className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 hover:ring-1 hover:ring-blue-400 hover:shadow-md cursor-pointer transition-all group relative"
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-blue-50 text-blue-700 text-xs font-mono font-bold px-2 py-1 rounded border border-blue-100">
                                            {job.code}
                                        </span>
                                        <h4 className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors">
                                            {job.title}
                                        </h4>
                                    </div>
                                    <div className="flex gap-2 items-start">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {job.match_reason}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors flex-shrink-0">
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 5. DISCLAIMER FOOTER (Styled like Home Page "Compliance Facts") */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-8">
            <div className="bg-orange-50 px-5 py-3 border-b border-orange-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-gray-900">Transparent AI Disclosure</h3>
            </div>
            <div className="p-5 text-sm text-gray-600 space-y-3">
                 <p className="leading-relaxed">
                    This tool uses <strong>semantic analysis</strong> to compare your input against the 2018 O*NET-SOC Taxonomy. It is designed to assist in finding the closest standard classification.
                </p>
                <div className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500">
                        <strong>Verification Required:</strong> AI predictions are suggestions, not legal determinations. Always verify the SOC code with your employer's LCA (Labor Condition Application) or immigration counsel.
                    </p>
                </div>
            </div>
        </div>

      </div>
    </main>
  );
}