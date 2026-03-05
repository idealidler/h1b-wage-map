"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, AlertTriangle, ShieldCheck, 
  ArrowRight, AlertCircle, Loader2,
  CheckCircle2, Info, SearchX, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";

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

// Animation variants for staggered list reveals
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-grow flex flex-col gap-6">
        
        {/* Page Header */}
        <header className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(15,23,42,0.03)] space-y-4">
            <div className="space-y-3 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
                    Find Your SOC Code with AI
                </h1>
                <p className="text-[var(--foreground-muted)] text-base sm:text-lg max-w-3xl mx-auto font-medium">
                    Describe your role to get official SOC code options, then jump directly to the H-1B county wage map to check your odds.
                </p>
            </div>
        </header>

        {/* Interactive Workspace */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 w-full min-h-[460px] shadow-[0_4px_20px_rgba(15,23,42,0.03)] relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* 1. INPUT STATE */}
            {!loading && results.length === 0 && !hasSearched && (
                <motion.div 
                  key="input-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                  className="w-full space-y-6"
                >
                    <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden focus-within:ring-4 focus-within:ring-[var(--ring-subtle)] focus-within:border-[var(--brand-primary)] transition-all duration-300 flex flex-col bg-white shadow-sm">
                            <div className="px-6 py-4 bg-[var(--background-alt)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="bg-[var(--brand-primary-muted)] p-1.5 rounded-lg">
                                      <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                                    </div>
                                    <span className="text-[15px] font-bold text-[var(--foreground)]">AI SOC Matcher for H-1B</span>
                                </div>
                                <span className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Include tasks, tools & seniority</span>
                            </div>

                            <textarea 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full min-h-[280px] p-6 bg-white border-0 outline-none focus:ring-0 text-[var(--foreground)] text-lg leading-relaxed placeholder:text-slate-300 resize-none font-medium"
                                placeholder="Example: I build backend APIs using Python and AWS, design database schemas, review pull requests, and mentor two junior engineers."
                                autoFocus
                            />
                            
                            <div className="bg-[var(--background-alt)] px-6 py-5 border-t border-[var(--border-subtle)] space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="tech-stack-input" className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
                                        Optional tech stack
                                    </label>
                                    <input
                                        id="tech-stack-input"
                                        type="text"
                                        value={techStack}
                                        onChange={(e) => setTechStack(e.target.value)}
                                        placeholder="e.g., Python, AWS, PostgreSQL, React"
                                        className="w-full rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] placeholder:text-slate-300 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--ring-subtle)] transition-all duration-200"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                                  <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] font-semibold">
                                          <ShieldCheck className="w-4.5 h-4.5 text-[var(--brand-success)]" /> 
                                          Secure and private analysis
                                      </div>
                                      {!canAnalyze && (
                                          <p className="text-[12px] font-medium text-[var(--brand-warning)]">Add at least {minCharsRemaining} more character{minCharsRemaining === 1 ? "" : "s"} to run matching.</p>
                                      )}
                                  </div>

                                  <button
                                      type="button"
                                      onClick={handleAnalyze}
                                      disabled={!canAnalyze || loading}
                                      className={`btn-primary !px-8 text-base ${!canAnalyze ? 'opacity-50 grayscale-[30%] cursor-not-allowed' : 'hover:-translate-y-0.5 shadow-lg shadow-blue-900/15'}`}
                                  >
                                      Find SOC Options
                                  </button>
                                </div>
                            </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
                        <h3 className="text-[13px] font-bold text-[var(--foreground)] mb-2.5 flex items-center gap-2">
                          <Info className="w-4 h-4 text-[var(--brand-primary)]" />
                          Tips for high-accuracy matches
                        </h3>
                        <div className="space-y-2 text-[13px] font-medium text-[var(--foreground-muted)] leading-relaxed pl-6">
                          <p className="relative before:absolute before:left:-4 before:content-['•'] before:text-[var(--brand-primary)]">Start with main responsibilities (3-5 sentences).</p>
                          <p className="relative before:absolute before:left:-4 before:content-['•'] before:text-[var(--brand-primary)]">Include seniority and ownership scope.</p>
                          <p className="relative before:absolute before:left:-4 before:content-['•'] before:text-[var(--brand-primary)]">Add specific tools/frameworks to match O*NET examples.</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* 2. LOADING STATE */}
            {loading && (
                <motion.div 
                  key="loading-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8"
                >
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-[var(--brand-primary)] blur-xl opacity-20 rounded-full animate-pulse"></div>
                      <Loader2 className="w-12 h-12 text-[var(--brand-primary)] animate-spin relative z-10" />
                    </div>
                    
                    <AnimatePresence mode="wait">
                      <motion.p 
                        key={loadingIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                        className="font-bold text-[var(--foreground)] text-[17px]" 
                        aria-live="polite"
                      >
                          {LOADING_MESSAGES[loadingIndex]}
                      </motion.p>
                    </AnimatePresence>

                    <div className="w-64 h-1.5 rounded-full bg-[var(--surface-muted)] mt-6 overflow-hidden border border-[var(--border-subtle)]">
                        <motion.div 
                          className="h-full bg-[var(--brand-primary)] rounded-full" 
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: (LOADING_MESSAGES.length * 2.2), ease: "linear" }}
                        />
                    </div>
                </motion.div>
            )}
            
            {/* 3. RESULTS STATE */}
            {!loading && results.length > 0 && (
                 <motion.div 
                  key="results-state"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-4xl mx-auto w-full space-y-6"
                 >
                    <div className="flex flex-col sm:flex-row items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                        <div className="space-y-1.5">
                            <h2 className="font-bold text-[var(--foreground)] text-2xl">Recommended Matches</h2>
                            <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Select the most accurate match to open the wage map.</p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => {setResults([]); setInput(""); setTechStack(""); setHasSearched(false); setError(null);}}
                            className="btn-secondary !py-2.5 !min-h-[40px] text-sm"
                        >
                            New Search
                        </button>
                    </div>

                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 gap-4"
                    >
                        {results.map((job, idx) => {
                            const isTopPick = idx === 0;
                            return (
                                <motion.button 
                                    variants={itemVariants}
                                    key={idx}
                                    onClick={() => handleSelect(job.code, job.title)}
                                    className={`group w-full text-left p-6 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-[0_8px_30px_rgba(37,99,235,0.06)] hover:scale-[1.01] outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring-subtle)] ${
                                      isTopPick 
                                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-muted)]/40 border-l-4 shadow-sm' 
                                        : 'bg-white border-[var(--border-subtle)] hover:border-[var(--brand-primary)]'
                                    }`}
                                >
                                    <div className="space-y-2.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {isTopPick && (
                                                <span className="bg-[var(--brand-primary)] text-white shadow-sm text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Best Match
                                                </span>
                                            )}
                                            <span className="text-[var(--foreground-muted)] text-[13px] font-mono font-bold bg-[var(--surface-muted)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)]">
                                                SOC {formatSocCode(job.code)}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-[var(--foreground)] text-lg sm:text-xl group-hover:text-[var(--brand-primary)] transition-colors">
                                            {job.title}
                                        </h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] pt-1">Match Reasoning</p>
                                        <p className="text-[14px] text-[var(--foreground)] font-medium leading-relaxed">
                                            {job.match_reason}
                                        </p>
                                    </div>
                                    <div className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                                      isTopPick 
                                        ? 'bg-[var(--brand-primary)] text-white shadow-md group-hover:scale-110' 
                                        : 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:shadow-md group-hover:scale-110'
                                    }`}>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </motion.button>
                            )
                        })}
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                      className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-amber-800 text-[13px] font-medium shadow-sm"
                    >
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                        <p className="leading-relaxed">
                            This tool estimates the closest official SOC code based on your input. Always verify your final code with your employer or legal counsel before submitting immigration forms.
                        </p>
                    </motion.div>
                 </motion.div>
            )}

            {/* 4. NO MATCHES STATE */}
            {!loading && hasSearched && results.length === 0 && !error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto w-full p-10 text-center space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]"
                >
                    <SearchX className="w-10 h-10 text-[var(--foreground-muted)] mx-auto mb-2" />
                    <h2 className="text-xl font-bold text-[var(--foreground)]">We couldn&apos;t find a strong match</h2>
                    <p className="text-[var(--foreground-muted)] font-medium leading-relaxed max-w-lg mx-auto">
                        Try adding a bit more detail about your daily work, tools, and seniority level. A clearer description usually returns better matches against O*NET data.
                    </p>
                    <div className="pt-4">
                        <button
                            type="button"
                            onClick={() => setHasSearched(false)}
                            className="btn-secondary !rounded-full !px-8"
                        >
                            Refine Description
                        </button>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ERROR NOTIFICATION */}
        <AnimatePresence>
          {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-800 p-4 rounded-xl flex items-center justify-between gap-4 mt-2 shadow-sm" 
                role="alert" 
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-[13px] font-bold">{error}</div>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-red-700 hover:text-red-900 bg-white px-3 py-1.5 rounded-lg border border-red-200 shadow-sm hover:shadow-md transition-all whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </motion.div>
          )}
        </AnimatePresence>

      </div>

      <SiteFooter />
    </main>
  );
}