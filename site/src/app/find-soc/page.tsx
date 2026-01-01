"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Search, ChevronRight, Info, Bot, CheckCircle2, Database, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";
import LcaSearch from "@/components/LcaSearch"; 

export default function FindSocPage() {
  const router = useRouter();
  
  // Default to DB since it is recommended now
  const [activeTab, setActiveTab] = useState<"ai" | "db">("db");

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
      
      {/* 1. TOP NAV */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all">
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-1.5 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-700" />
                </div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                    Smart SOC Finder
                </h1>
            </div>
          </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 w-full space-y-6 flex-grow">
        
        {/* 2. HERO */}
        <div className="text-center space-y-6">
            <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    Find Your Official Code
                </h2>
                <p className="text-gray-600 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                    Search historical LCA filings to confirm what your company uses, or use AI to match your duties.
                </p>
            </div>

            {/* TOGGLE SWITCH - With "Recommended" Badge */}
            <div className="bg-gray-100 p-1.5 rounded-xl inline-flex relative shadow-inner">
                <button
                    onClick={() => setActiveTab("db")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all relative ${
                        activeTab === "db" 
                        ? "bg-white text-purple-700 shadow-sm ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Database className="w-4 h-4" />
                    Company Data
                    {/* Badge */}
                    {activeTab !== "db" && (
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                            Best
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("ai")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        activeTab === "ai" 
                        ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Bot className="w-4 h-4" />
                    AI Matcher
                </button>
            </div>
        </div>

        {/* 3. CONTENT AREA */}
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            
            {activeTab === "db" && (
                <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                     <LcaSearch />
                </div>
            )}

            {activeTab === "ai" && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="relative">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full h-56 p-6 resize-none focus:outline-none text-gray-900 text-base leading-relaxed placeholder-gray-400"
                            placeholder="Paste your job description here..."
                        />
                        <div className="absolute bottom-4 right-6">
                             <span className="text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center gap-1">
                                <Bot className="w-3 h-3" /> Llama 3
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
                                    : "bg-blue-700 hover:bg-blue-800"
                                }
                            `}
                        >
                            {loading ? "Analyzing..." : <> <Search className="w-4 h-4" /> Match Job Title </>}
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        {/* Results for AI Mode (Same as before) */}
        {activeTab === "ai" && results.length > 0 && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
                {results.map((job, idx) => (
                    <div 
                        key={idx}
                        onClick={() => handleSelect(job.code, job.title)}
                        className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
                    >
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg group-hover:text-blue-700">{job.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{job.match_reason}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                ))}
            </div>
        )}

      </div>
    </main>
  );
}