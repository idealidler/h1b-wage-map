"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Search, Briefcase, ChevronRight } from "lucide-react";
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
    // Redirect to home page with query params
    router.push(`/?soc=${code}&title=${encodeURIComponent(title)}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-2">
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Map
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-600" />
                Find Your SOC Code
            </h1>
            <p className="text-gray-600 text-lg">
                Paste your resume, job description, or daily duties below. Our AI will match you to the correct official government classification.
            </p>
        </div>

        {/* Input Area */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-800 placeholder-gray-400 resize-none"
                placeholder="Example: I build React applications using Next.js. I also manage AWS infrastructure and write Python scripts for data analysis..."
            />
            
            <div className="flex justify-end items-center gap-4">
                {/* Show a subtle spinner while thinking */}
                {loading && <span className="text-sm text-purple-600 animate-pulse font-medium">Analyzing duties...</span>}
    
                <button
                    onClick={handleAnalyze}
                    disabled={loading || !input.trim()}
                    className={`px-6 py-3 rounded-lg font-semibold text-white transition-all flex items-center gap-2
                        ${loading || !input.trim() 
                            ? "bg-gray-300 cursor-not-allowed" 
                            : "bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                        }
                    `}
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    ) : (
                        <>
                            <Search className="w-4 h-4" /> Analyze Description
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Results Area */}
        {results.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-gray-900">Top Matches</h3>
                <div className="grid gap-4">
                    {results.map((job, idx) => (
                        <div 
                            key={idx}
                            onClick={() => handleSelect(job.code, job.title)}
                            className="bg-white p-5 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
                        >
                            <div className="absolute left-0 top-0 w-1 h-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-purple-50 text-purple-700 text-xs font-mono px-2 py-0.5 rounded border border-purple-100">
                                            {job.code}
                                        </span>
                                        <h4 className="font-bold text-gray-900 text-lg group-hover:text-purple-700 transition-colors">
                                            {job.title}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {job.match_reason}
                                    </p>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-purple-600 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </main>
  );
}