"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import JobSearch from "@/components/JobSearch";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { Link as LinkIcon, Check, Map as MapIcon, ExternalLink, BadgeCheck, X, RotateCcw } from "lucide-react";
import { motion , Variants} from "framer-motion";

const FR_RULE_URL =
  "https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b";
const FR_PROBABILITY_IMAGE_URL =
  "https://img.federalregister.gov/ER29DE25.021/ER29DE25.021_original_size.png";
const DOL_WAGE_URL = "https://www.flcdatacenter.com/";
const DOL_PERFORMANCE_URL = "https://www.dol.gov/agencies/eta/foreign-labor/performance";

const WageMap = dynamic(() => import("@/components/WageMap"), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full animate-pulse rounded-2xl bg-slate-100 md:h-[650px]" aria-label="Loading wage map" />,
});

const LcaSearch = dynamic(() => import("@/components/LcaSearch"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse rounded-xl bg-slate-100" aria-label="Loading employer search" />,
});

const containerVariants : Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants : Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function SocialShare() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`btn-secondary !py-2 !px-4 !min-h-[36px] text-sm font-bold transition-all duration-300 ${
        copied 
          ? "!bg-[var(--brand-success)] !text-white !border-[var(--brand-success)] shadow-md" 
          : ""
      }`}
    >
      {copied ? <Check className="w-4 h-4 mr-1.5" /> : <LinkIcon className="w-4 h-4 mr-1.5 text-[var(--foreground-muted)]" />}
      {copied ? "Link copied!" : "Share Link"}
    </button>
  );
}

function WageMapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDataNotice, setShowDataNotice] = useState(true);

  const initialSoc = searchParams.get("soc");
  const initialTitle = searchParams.get("title");
  const initialSalary = Number.parseInt(searchParams.get("salary") || "", 10);
  const [selectedSoc, setSelectedSoc] = useState<string>(
    initialSoc ? (initialSoc.includes(".") ? initialSoc : `${initialSoc}.00`) : "15-1252.00"
  );
  const [jobTitle, setJobTitle] = useState<string>(initialTitle || "Software Developers");
  const [salary, setSalary] = useState<number | "">(Number.isFinite(initialSalary) ? initialSalary : 120000);
  const hasMounted = useRef(false);
  const [employerSpotlight, setEmployerSpotlight] = useState(false);
  const salaryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (selectedSoc) params.set("soc", selectedSoc);
    else params.delete("soc");
    if (jobTitle) params.set("title", jobTitle);
    else params.delete("title");
    if (salary === "") params.delete("salary");
    else params.set("salary", String(salary));
    const nextQuery = params.toString();
    if (nextQuery !== searchParams.toString()) {
      router.replace(`/?${nextQuery}`, { scroll: false });
    }
  }, [jobTitle, router, salary, searchParams, selectedSoc]);

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    setSalary(rawValue ? parseInt(rawValue, 10) : "");
  };

  const resetBenchmark = () => {
    setSelectedSoc("15-1252.00");
    setJobTitle("Software Developers");
    setSalary(120000);
  };

  // Master Scroll Controller
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const navEntries = window.performance?.getEntriesByType("navigation") || [];
    const isReload = navEntries.length > 0 && (navEntries[0] as PerformanceNavigationTiming).type === "reload";

    if (isReload) {
      window.sessionStorage.removeItem("focus-employer-soc");
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    }
  }, []);

  const triggerEmployerFocus = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("focus-employer-soc", "1");
    window.dispatchEvent(new Event("focus-employer-soc"));
  };

  // Bulletproof Inter-page Focus Logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusEvent = () => {
      const shouldFocus =
        window.location.hash === "#find-soc-employer" ||
        window.sessionStorage.getItem("focus-employer-soc") === "1";
      if (!shouldFocus) return;

      window.sessionStorage.removeItem("focus-employer-soc");
      setEmployerSpotlight(true);

      // We wait 150ms to guarantee Mapbox and layout has fully painted its height
      setTimeout(() => {
        const section = document.getElementById("find-soc-employer");
        const input = document.getElementById("employer-search-input") as HTMLInputElement | null;

        section?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => input?.focus(), 450);
        setTimeout(() => setEmployerSpotlight(false), 3500);
      }, 150); 
    };

    // Run on initial mount (with a small delay) if navigating from /find
    const mountTimer = setTimeout(() => {
      handleFocusEvent();
    }, 100);

    window.addEventListener("focus-employer-soc", handleFocusEvent as EventListener);
    window.addEventListener("hashchange", handleFocusEvent);
    return () => {
      clearTimeout(mountTimer);
      window.removeEventListener("focus-employer-soc", handleFocusEvent as EventListener);
      window.removeEventListener("hashchange", handleFocusEvent);
    };
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-canvas min-h-screen flex flex-col relative font-sans">
      <Navbar />

      {showDataNotice && (
        <div className="border-b border-emerald-200 bg-emerald-50" role="status" aria-label="Current wage data">
          <div className="relative max-w-7xl mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3 text-emerald-950">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold leading-5 sm:text-[15px]">
                Latest DOL-published wage data: OFLC reference dataset
              </p>
              <p className="text-xs font-medium leading-5 text-emerald-800 sm:text-sm">
                Data series: 07/2026 - 06/2027. Employer filing data is historical.
              </p>
            </div>
          </div>
          <a
            href={DOL_WAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-8 inline-flex items-center gap-1 text-xs font-bold text-emerald-900 underline decoration-emerald-400 underline-offset-2 hover:text-emerald-700 sm:ml-0 sm:shrink-0 sm:text-sm"
          >
            View DOL source <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => {
              setShowDataNotice(false);
            }}
            className="absolute right-3 top-3 rounded-md p-1 text-emerald-800 transition-colors hover:bg-emerald-100 hover:text-emerald-950 sm:static sm:ml-2"
            aria-label="Dismiss wage data notice"
            title="Dismiss wage data notice"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          </div>
        </div>
      )}

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5 flex-grow w-full"
      >
        {/* Page Header */}
        <motion.section variants={itemVariants} className="border-b border-[var(--border-subtle)] pb-6 pt-1 sm:pb-7" aria-labelledby="page-title">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
                 <span className="inline-flex items-center gap-2 text-[var(--brand-primary)]">
                   <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                   Wage intelligence workspace
                 </span>
                 <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" aria-hidden="true" />
                 <span>Data series 07/2026 - 06/2027</span>
              </div>
              <h1 id="page-title" className="text-3xl font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl">
                H-1B Wage Map 🇺🇸
              </h1>
              <p className="mt-2 max-w-3xl text-[15px] font-medium leading-7 text-[var(--foreground-muted)]">
                Find your SOC code and check prevailing wage levels across U.S. counties to determine your lottery selection odds.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="grid grid-cols-3 gap-4 text-left lg:text-right">
                <div>
                  <p className="font-mono text-lg font-bold tracking-tight text-[var(--foreground)]">848</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">SOC codes</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-bold tracking-tight text-[var(--foreground)]">3,131</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">counties</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-bold tracking-tight text-[var(--foreground)]">07/26</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">series start</p>
                </div>
              </div>
              <SocialShare />
            </div>
          </div>
        </motion.section>

        {/* Core Controls */}
        <motion.section variants={itemVariants} id="wage-map-workspace" className="rounded-[var(--radius-surface)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-surface)] sm:p-6">
          <div className="mb-5 flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-primary)]">01 / Define your benchmark</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl">Set the role and compensation</h2>
              <p className="mt-1 text-sm font-medium text-[var(--foreground-muted)]">Choose an official occupation and enter annual base pay to compare county wage levels.</p>
            </div>
            <button
              type="button"
              onClick={resetBenchmark}
              className="inline-flex items-center gap-1.5 self-start text-xs font-bold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset benchmark
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2.5">
              <label htmlFor="soc-search-input" className="text-[13px] font-bold text-[var(--foreground)] ml-1">
                Job Title or SOC Code
              </label>
              <JobSearch
                inputId="soc-search-input"
                ariaDescribedBy="soc-search-help"
                initialValue={`${selectedSoc} - ${jobTitle}`}
                onSelect={(soc, title) => {
                  if (soc) {
                    setSelectedSoc(soc);
                    setJobTitle(title);
                    setTimeout(() => salaryInputRef.current?.focus(), 100);
                  }
                }}
              />
              <p id="soc-search-help" className="text-xs text-[var(--foreground-muted)] font-medium ml-1">
                Don&apos;t know your SOC?{" "}
                <button 
                  onClick={triggerEmployerFocus} 
                  className="text-[var(--brand-primary)] font-bold hover:underline transition-colors outline-none"
                >
                  Use Employer Data
                </button>.
              </p>
            </div>

            <div className="space-y-2.5">
              <label htmlFor="target-salary" className="text-[13px] font-bold text-[var(--foreground)] ml-1">
                Target Base Salary
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-[var(--foreground-muted)] font-bold text-lg group-focus-within:text-[var(--brand-primary)] transition-colors">$</span>
                </div>
                <input
                  id="target-salary"
                  ref={salaryInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-describedby="salary-help"
                  value={salary === "" ? "" : salary.toLocaleString()}
                  onChange={handleSalaryChange}
                  className="w-full pl-9 pr-4 py-3.5 min-h-[52px] bg-white border border-[var(--border-subtle)] focus:ring-4 focus:ring-[var(--ring-subtle)] focus:border-[var(--brand-primary)] rounded-2xl outline-none text-[var(--foreground)] font-bold text-[17px] transition-all duration-300 shadow-[0_2px_8px_rgba(15,23,42,0.04)] placeholder:text-slate-300 placeholder:font-medium"
                  placeholder="120,000"
                />
              </div>
              <p id="salary-help" className="text-xs text-[var(--foreground-muted)] font-medium ml-1">
                Annual base pay only. Exclude bonuses and equity.
              </p>
            </div>

          </div>
        </motion.section>

        {/* The Map Component */}
        <motion.section id="wage-map-section" variants={itemVariants} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1.5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]" aria-label="County wage level map">
          <WageMap socCode={selectedSoc} jobTitle={jobTitle} userSalary={salary === "" ? 0 : salary} />
        </motion.section>

        {/* Employer Search Section with Framer Motion Animation */}
        <motion.section 
          id="find-soc-employer" 
          animate={employerSpotlight ? { scale: 1.02, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`scroll-mt-32 mt-6 rounded-[var(--radius-surface)] border bg-[var(--surface-raised)] p-5 sm:p-7 transition-colors duration-700 ${
            employerSpotlight 
              ? "border-[var(--brand-primary)] ring-4 ring-[var(--ring-subtle)] shadow-[0_16px_40px_rgba(37,99,235,0.12)] relative z-20" 
              : "border-[var(--border-subtle)] shadow-[0_2px_12px_rgba(15,23,42,0.03)] relative z-0"
          }`}
        >
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-primary)]">03 / Research employer patterns</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">Find the SOC code your employer actually used</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--foreground-muted)] sm:text-[15px]">
                Enter a company name to review historical certified LCA filings by job title. Use the past SOC mappings as a practical reference before comparing wage levels on the map.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-alt)] p-2 text-center sm:min-w-[360px]">
              {[
                ["1", "Search company"],
                ["2", "Review roles"],
                ["3", "Open map"],
              ].map(([step, label]) => (
                <div key={step} className="rounded-xl bg-white px-2 py-2.5">
                  <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-primary-muted)] text-xs font-bold text-[var(--brand-primary)]">{step}</span>
                  <span className="mt-1 block text-[11px] font-bold leading-tight text-[var(--foreground-muted)]">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <LcaSearch
            inputId="employer-search-input"
            spotlight={employerSpotlight}
            onSelectSoc={(soc, title) => {
              setSelectedSoc(soc);
              setJobTitle(title);
            }}
          />
        </motion.section>

        {/* Industry Standard References Section */}
        <motion.section variants={itemVariants} className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
          <h2 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-widest mb-5">
            Methodology & Official Data Sources
          </h2>
          
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 text-sm">
            <li className="flex items-start gap-3 text-[var(--foreground-muted)] group">
              <span className="font-mono text-[10px] font-bold bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] mt-0.5">01</span>
              <div>
                <a href={DOL_WAGE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--foreground)] hover:text-[var(--brand-primary)] hover:underline underline-offset-2 transition-all inline-flex items-center gap-1">
                  DOL FLC Data Center <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </a>
                <p className="text-xs mt-1 leading-relaxed">Official prevailing wage levels structured by Standard Occupational Classification (SOC) code and localized county data.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 text-[var(--foreground-muted)] group">
              <span className="font-mono text-[10px] font-bold bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] mt-0.5">02</span>
              <div>
                <a href={DOL_PERFORMANCE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--foreground)] hover:text-[var(--brand-primary)] hover:underline underline-offset-2 transition-all inline-flex items-center gap-1">
                  Foreign Labor Performance Data <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </a>
                <p className="text-xs mt-1 leading-relaxed">Historical certified LCA filings utilized for accurate employer-to-title probability mapping and analytics.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 text-[var(--foreground-muted)] group">
              <span className="font-mono text-[10px] font-bold bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] mt-0.5">03</span>
              <div>
                <a href={FR_RULE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--foreground)] hover:text-[var(--brand-primary)] hover:underline underline-offset-2 transition-all inline-flex items-center gap-1">
                  Federal Register H-1B Registration Rule <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </a>
                <p className="text-xs mt-1 leading-relaxed">The registration rule behind the weighted-entry estimates shown on the map. Estimates are not a guarantee of selection.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 text-[var(--foreground-muted)] group">
              <span className="font-mono text-[10px] font-bold bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] mt-0.5">04</span>
              <div>
                <a href={FR_PROBABILITY_IMAGE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--foreground)] hover:text-[var(--brand-primary)] hover:underline underline-offset-2 transition-all inline-flex items-center gap-1">
                  Probability Exhibit Model <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </a>
                <p className="text-xs mt-1 leading-relaxed">Published weighted-entry probability table used to explain the estimated registration odds for Levels I through IV.</p>
              </div>
            </li>
          </ol>
        </motion.section>

      </motion.div>

      <SiteFooter />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background-alt)]">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--brand-primary)] blur-xl opacity-20 rounded-full animate-pulse"></div>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-primary)] relative z-10"></div>
          </div>
        </div>
      }
    >
      <WageMapContent />
    </Suspense>
  );
}
