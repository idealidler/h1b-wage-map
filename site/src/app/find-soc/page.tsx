"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Search, ChevronRight, Info, Bot, Database, AlertTriangle, FileText, Cpu, MousePointerClick, ShieldCheck, ArrowRight } from "lucide-react";
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
                    Search historical LCA filings to confirm what your company uses, or use AI to analyze your job description.
                </p>
            </div>

            {/* TOGGLE SWITCH */}
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
            
            {/* --- VIEW 1: COMPANY DATABASE --- */}
            {activeTab === "db" && (
                <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                     <LcaSearch />
                </div>
            )}

            {/* --- VIEW 2: AI MATCHER --- */}
            {activeTab === "ai" && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    
                    {/* A. HOW IT WORKS */}
                    <div className="bg-blue-50/50 border-b border-blue-50 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="text-xs text-blue-900 font-bold">1. Paste Job Details</div>
                            <p className="text-[10px] text-blue-700/70">Copy your resume summary or job description.</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="bg-white p-2 rounded-lg shadow-sm text-purple-600">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <div className="text-xs text-purple-900 font-bold">2. AI Analysis</div>
                            <p className="text-[10px] text-purple-700/70">We match it against 800+ official O*NET codes.</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="bg-white p-2 rounded-lg shadow-sm text-green-600">
                                <MousePointerClick className="w-5 h-5" />
                            </div>
                            <div className="text-xs text-green-900 font-bold">3. Click to View Map</div>
                            <p className="text-[10px] text-green-700/70">Select the best match to see wage data.</p>
                        </div>
                    </div>

                    {/* B. INPUT AREA (Updated for User Friendliness) */}
                    <div className="relative">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            // CLEAN: No padding bottom hacks or floating elements blocking text
                            className="w-full h-48 p-6 resize-none focus:outline-none text-gray-900 text-base leading-relaxed placeholder-gray-400"
                            placeholder="Example: 'I am a Software Engineer working with React, Node.js and AWS. I design scalable APIs and manage cloud infrastructure...'"
                        />
                    </div>
                    
                    {/* FOOTER BAR (Moved Badges Here) */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        
                        {/* Left: Trust Signals */}
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                             <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Private & Anonymous
                             </div>
                             
                             <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                             
                             <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                                <Bot className="w-3.5 h-3.5" /> Llama 3
                             </span>
                        </div>

                        {/* Right: Action Button */}
                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !input.trim()}
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-sm flex items-center justify-center gap-2
                                ${loading || !input.trim() 
                                    ? "bg-gray-300 cursor-not-allowed" 
                                    : "bg-blue-700 hover:bg-blue-800 hover:shadow-md hover:-translate-y-0.5"
                                }
                            `}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" /> Match Job Title
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        {/* 4. AI RESULTS SECTION */}
        {activeTab === "ai" && results.length > 0 && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 pb-12">
                
                {/* Instruction Banner */}
                <div className="flex items-center gap-2 justify-center py-2 bg-blue-50 text-blue-800 rounded-lg text-sm font-bold border border-blue-100">
                    <MousePointerClick className="w-4 h-4" />
                    👇 Select a match below to view Wage Map
                </div>

                {results.map((job, idx) => (
                    <div 
                        key={idx}
                        onClick={() => handleSelect(job.code, job.title)}
                        className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 hover:ring-1 hover:ring-blue-400 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
                    >
                        {/* Hover Effect Indicator */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="bg-gray-100 text-gray-600 text-xs font-mono font-bold px-2 py-1 rounded border border-gray-200 group-hover:bg-blue-100 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
                                        {job.code}
                                    </span>
                                    <h4 className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors">
                                        {job.title}
                                    </h4>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {job.match_reason}
                                </p>
                            </div>
                            
                            {/* Call to Action Button Visual */}
                            <div className="hidden sm:flex items-center gap-1 text-sm font-bold text-gray-300 group-hover:text-blue-600 transition-colors self-center">
                                View Map <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* 5. DISCLAIMER (Only on AI Tab) */}
        {activeTab === "ai" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-8 opacity-70 hover:opacity-100 transition-opacity">
                <div className="bg-orange-50 px-5 py-3 border-b border-orange-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <h3 className="text-sm font-bold text-gray-900">Important Disclaimer</h3>
                </div>
                <div className="p-5 text-sm text-gray-600 space-y-3">
                     <p className="leading-relaxed">
                        This tool uses <strong>RAG (Retrieval-Augmented Generation)</strong> to find the closest official SOC code based on your input. It is an estimation tool, not legal advice. Always verify your official job code with your employer's immigration team or attorney before filing.
                    </p>
                </div>
            </div>
        )}

      </div>
    </main>
  );
}