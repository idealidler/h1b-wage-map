"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import JobSearch from "@/components/JobSearch";
import WageMap from "@/components/WageMap";
import LcaSearch from "@/components/LcaSearch";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { Link as LinkIcon, Check, Map as MapIcon, Building2, ExternalLink } from "lucide-react";
import { motion , Variants} from "framer-motion";

const FR_RULE_URL =
  "https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b";
const FR_PROBABILITY_IMAGE_URL =
  "https://img.federalregister.gov/ER29DE25.021/ER29DE25.021_original_size.png";
const DOL_WAGE_URL = "https://www.flcdatacenter.com/";
const DOL_PERFORMANCE_URL = "https://www.dol.gov/agencies/eta/foreign-labor/performance";

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
  const searchParams = useSearchParams();

  const [selectedSoc, setSelectedSoc] = useState<string>("15-1252.00");
  const [jobTitle, setJobTitle] = useState<string>("Software Developers");
  const [salary, setSalary] = useState<number | "">(120000);
  const [employerSpotlight, setEmployerSpotlight] = useState(false);
  const salaryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urlSoc = searchParams.get("soc");
    const urlTitle = searchParams.get("title");

    if (urlSoc && urlTitle) {
      const formattedSoc = urlSoc.includes(".") ? urlSoc : `${urlSoc}.00`;
      setSelectedSoc(formattedSoc);
      setJobTitle(urlTitle);
    }
  }, [searchParams]);

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    setSalary(rawValue ? parseInt(rawValue, 10) : "");
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
    <main className="min-h-screen flex flex-col relative font-sans bg-[var(--background-alt)]">
      <Navbar />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5 flex-grow w-full"
      >
        {/* Page Header */}
        <motion.section variants={itemVariants} className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-3 rounded-md bg-[var(--surface-muted)] border border-[var(--border-subtle)]">
                 <MapIcon className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                 <span className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Interactive Data Explorer</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
                H-1B Wage Map FY 2027 🇺🇸
              </h1>
              <p className="text-[15px] text-[var(--foreground-muted)] font-medium mt-1.5 max-w-3xl">
                Find your SOC code and check prevailing wage levels across U.S. counties to determine your lottery selection odds.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SocialShare />
            </div>
          </div>
        </motion.section>

        {/* Core Controls */}
        <motion.section variants={itemVariants} id="wage-map-workspace" className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
          <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-6">
            
            <div className="space-y-2.5">
              <label htmlFor="soc-search-input" className="text-[13px] font-bold text-[var(--foreground)] uppercase tracking-widest ml-1">
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
              <label htmlFor="target-salary" className="text-[13px] font-bold text-[var(--foreground)] uppercase tracking-widest ml-1">
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
                Base pay only (exclude bonuses and RSUs).
              </p>
            </div>

          </div>
        </motion.section>

        {/* The Map Component */}
        <motion.section variants={itemVariants} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1.5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]" aria-label="County wage level map">
          <WageMap socCode={selectedSoc} jobTitle={jobTitle} userSalary={salary === "" ? 0 : salary} />
        </motion.section>

        {/* Employer Search Section with Framer Motion Animation */}
        <motion.section 
          id="find-soc-employer" 
          animate={employerSpotlight ? { scale: 1.02, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`scroll-mt-32 mt-6 rounded-2xl border bg-white p-6 sm:p-8 transition-colors duration-700 ${
            employerSpotlight 
              ? "border-[var(--brand-primary)] ring-4 ring-[var(--ring-subtle)] shadow-[0_16px_40px_rgba(37,99,235,0.12)] relative z-20" 
              : "border-[var(--border-subtle)] shadow-[0_2px_12px_rgba(15,23,42,0.03)] relative z-0"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Find SOC Code by Employer LCA Filings</h2>
              <p className="text-[15px] font-medium text-[var(--foreground-muted)] mt-1.5">
                Search historical employer LCA filings to find the closest SOC code before opening the wage map.
              </p>
            </div>
          </div>
          <LcaSearch inputId="employer-search-input" spotlight={employerSpotlight} />
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
                  Federal Register FY2027 Rule <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </a>
                <p className="text-xs mt-1 leading-relaxed">The final Department of Homeland Security rule dictating the wage-weighted selection framework and legal implementation.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 text-[var(--foreground-muted)] group">
              <span className="font-mono text-[10px] font-bold bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] mt-0.5">04</span>
              <div>
                <a href={FR_PROBABILITY_IMAGE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--foreground)] hover:text-[var(--brand-primary)] hover:underline underline-offset-2 transition-all inline-flex items-center gap-1">
                  Probability Exhibit Model <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </a>
                <p className="text-xs mt-1 leading-relaxed">Published weighted-entry probability table establishing multiplier odds for levels I through IV.</p>
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