"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, AlertTriangle, ShieldCheck, 
  ArrowRight, AlertCircle, Loader2,
  CheckCircle2, Info, SearchX, RotateCcw
} from "lucide-react";

import Navbar from "@/components/Navbar";

interface AiResult {
  code: string;
  title: string;
  match_reason: string;
}

interface ApiSuccessResponse {
  results: AiResult[];
}

interface ApiErrorResponse {
  error?: string;
}

const LOADING_MESSAGES = [
  "Analyzing your role description...",
  "Searching official Department of Labor data...",
  "Preparing your best SOC code options..."
];

function formatSocCode(code: string): string {
    return code.includes('.') ? code : `${code}.00`;
}

export default function FindSocPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [techStack, setTechStack] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AiResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const canAnalyze = input.trim().length >= 10;
  const minCharsRemaining = Math.max(0, 10 - input.trim().length);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2200);
    } else {
      setLoadingIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);

    try {
      const res = await fetch("/api/match-soc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: input, tech_stack: techStack }),
      });
      
      const data: unknown = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as ApiErrorResponse).error === "string"
            ? (data as ApiErrorResponse).error
            : "We could not analyze your description right now. Please try again.";
        throw new Error(errorMessage);
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "results" in data &&
        Array.isArray((data as ApiSuccessResponse).results)
      ) {
        const safeResults = (data as ApiSuccessResponse).results.filter(
          (result) =>
            typeof result?.code === "string" &&
            typeof result?.title === "string" &&
            typeof result?.match_reason === "string"
        );
        setResults(safeResults);
      } else {
        setResults([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "A network error occurred. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const handleSelect = (code: string, title: string) => {
    const formattedCode = formatSocCode(code);
    router.push(`/?soc=${formattedCode}&title=${encodeURIComponent(title)}`);
  };

  const handleRetry = () => {
    setError(null);
    if (canAnalyze) {
      void handleAnalyze();
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background-alt)] flex flex-col font-sans">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-grow flex flex-col gap-5">
        
        <header className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 shadow-sm space-y-5">
            <div className="space-y-3 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Find SOC using AI
                </h1>
                <p className="text-gray-600 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
                    Describe your day-to-day work and get official SOC options with clear match reasoning.
                </p>
            </div>
        </header>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 w-full min-h-[420px]">
            {!loading && results.length === 0 && !hasSearched && (
                <div id="ai-panel" role="tabpanel" className="w-full space-y-6 animate-in fade-in duration-300">
                    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--brand-primary)] transition-all flex flex-col bg-white">
                            <div className="px-6 py-4 bg-white border-b border-[var(--border-subtle)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                                    <span className="text-sm font-semibold text-gray-900">Describe your day-to-day responsibilities</span>
                                </div>
                                <span className="text-xs font-medium text-gray-500">Include tasks, tools, and seniority for better accuracy</span>
                            </div>

                            <textarea 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full min-h-[340px] p-7 bg-white border-0 outline-none focus:ring-0 text-gray-900 text-lg leading-8 placeholder:text-gray-400 resize-none"
                                placeholder="Example: I build backend APIs using Python and AWS, design database schemas, review pull requests, and mentor two junior engineers."
                                autoFocus
                            />
                            
                            <div className="bg-gray-50 px-6 py-4 border-t border-[var(--border-subtle)] space-y-4">
                                <div className="space-y-1">
                                    <label htmlFor="tech-stack-input" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                        Optional tech stack
                                    </label>
                                    <input
                                        id="tech-stack-input"
                                        type="text"
                                        value={techStack}
                                        onChange={(e) => setTechStack(e.target.value)}
                                        placeholder="Example: Python, AWS, PostgreSQL, React, Tableau"
                                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Adding tools/frameworks improves matching against O*NET technology examples.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                        <ShieldCheck className="w-4 h-4 text-[var(--brand-success)]" /> 
                                        Your input is secure and private
                                    </div>
                                    {!canAnalyze && (
                                        <p className="text-xs text-gray-500">Add at least {minCharsRemaining} more character{minCharsRemaining === 1 ? "" : "s"} to run matching.</p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAnalyze}
                                    disabled={!canAnalyze || loading}
                                    className={`btn-primary !min-h-[44px] !py-2.5 !px-6 text-base ${!canAnalyze || loading ? 'opacity-50 cursor-not-allowed hover:bg-[var(--brand-primary)]' : ''}`}
                                >
                                    Find SOC Options
                                </button>
                                </div>
                            </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border-subtle)] bg-gray-50 p-4 sm:p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4 text-[var(--brand-primary)]" />
                          How to get better matches
                        </h3>
                        <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                          <p>Start with main responsibilities (3-5 sentences).</p>
                          <p>Include seniority and ownership scope.</p>
                          <p>Add tools/frameworks and relevant domain context.</p>
                        </div>
                        <p className="text-xs text-gray-600 mt-3">Shortcut: Press <span className="font-semibold text-gray-900">Ctrl/Cmd + Enter</span> to run analysis.</p>
                    </div>

                </div>
            )}

            {loading && (
                <div id="ai-panel" role="tabpanel" className="max-w-3xl mx-auto w-full p-12 animate-in fade-in duration-300 flex flex-col items-center justify-center min-h-[420px]">
                    <Loader2 className="w-10 h-10 text-[var(--brand-primary)] animate-spin mb-6" />
                    <p className="font-bold text-gray-900 text-lg" aria-live="polite">
                        {LOADING_MESSAGES[loadingIndex]}
                    </p>
                    <div className="w-56 h-1.5 rounded-full bg-blue-100 mt-5 overflow-hidden">
                        <div className="h-full w-1/2 bg-[var(--brand-primary)] animate-pulse rounded-full" />
                    </div>
                </div>
            )}
            
            {!loading && results.length > 0 && (
                 <div id="ai-panel" role="tabpanel" className="max-w-4xl mx-auto w-full animate-in fade-in duration-500 space-y-5">
                    <div className="flex flex-col sm:flex-row items-end justify-between gap-4 border-b border-gray-200 pb-4">
                        <div className="space-y-1">
                            <h2 className="font-bold text-gray-900 text-2xl">Recommended SOC Codes</h2>
                            <p className="text-sm text-gray-600">Select a match to open the wage map.</p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => {setResults([]); setInput(""); setTechStack(""); setHasSearched(false); setError(null);}}
                            className="btn-secondary !py-2 !min-h-[36px] text-sm"
                        >
                            New Search
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {results.map((job, idx) => {
                            const isTopPick = idx === 0;
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => handleSelect(job.code, job.title)}
                                    className={`group w-full text-left bg-white p-5 sm:p-6 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-md hover:scale-[1.01] ${isTopPick ? 'border-[var(--brand-primary)] shadow-sm bg-gradient-to-r from-blue-50/40 to-white border-l-4 border-l-[var(--brand-primary)]' : 'border-[var(--border-subtle)] hover:border-[var(--brand-primary)]'}`}
                                >
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {isTopPick && (
                                                <span className="bg-blue-50 text-[var(--brand-primary)] text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Best Match
                                                </span>
                                            )}
                                            <span className="text-gray-500 text-sm font-mono font-bold">
                                                SOC {formatSocCode(job.code)}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg sm:text-xl">
                                            {job.title}
                                        </h3>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Why this matches</p>
                                        <p className="text-sm text-gray-600 leading-7">
                                            {job.match_reason}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-400 group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-[var(--border-subtle)] text-gray-600 text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-[var(--brand-accent)]" />
                        <p className="leading-relaxed">
                            This tool estimates the closest official SOC code. Please verify your final code with your employer or legal counsel before submitting forms.
                        </p>
                    </div>
                </div>
            )}

            {!loading && hasSearched && results.length === 0 && !error && (
                <div id="ai-panel" role="tabpanel" className="max-w-3xl mx-auto w-full card-container p-8 text-center space-y-4 animate-in fade-in duration-300">
                    <SearchX className="w-8 h-8 text-gray-400 mx-auto" />
                    <h2 className="text-xl font-bold text-gray-900">We couldn&apos;t find a strong match yet</h2>
                    <p className="text-gray-600 leading-relaxed">
                        Try adding a bit more detail about your daily work, tools, and seniority level. A clearer description usually returns better matches.
                    </p>
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setHasSearched(false)}
                            className="btn-secondary !min-h-[40px] !py-2 !px-5 text-sm"
                        >
                            Update Description
                        </button>
                    </div>
                </div>
            )}
        </div>

        {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg flex items-start justify-between gap-4 mt-4" role="alert" aria-live="polite">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="text-sm font-medium">{error}</div>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
        )}

      </div>
    </main>
  );
}
