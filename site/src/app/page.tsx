"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import JobSearch from "@/components/JobSearch";
import WageMap from "@/components/WageMap";
import LcaSearch from "@/components/LcaSearch";
import Navbar from "@/components/Navbar";
import { Linkedin, Github, Link as LinkIcon, Check, ArrowRight, ArrowDown, Database, ShieldCheck, Landmark, FileText } from "lucide-react";

const FR_RULE_URL =
  "https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b";
const FR_PROBABILITY_IMAGE_URL =
  "https://img.federalregister.gov/ER29DE25.021/ER29DE25.021_original_size.png";
const DOL_WAGE_URL = "https://www.flcdatacenter.com/";
const DOL_PERFORMANCE_URL = "https://www.dol.gov/agencies/eta/foreign-labor/performance";

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
      className={`btn-secondary !py-2 !px-4 !min-h-[36px] text-sm ${
        copied ? "bg-green-50 text-[var(--brand-success)] border-green-200" : ""
      }`}
    >
      {copied ? <Check className="w-4 h-4 mr-1.5" /> : <LinkIcon className="w-4 h-4 mr-1.5" />}
      {copied ? "Link copied!" : "Share Link"}
    </button>
  );
}

function WageMapContent() {
  const searchParams = useSearchParams();

  const [selectedSoc, setSelectedSoc] = useState<string>("15-1252.00");
  const [jobTitle, setJobTitle] = useState<string>("Software Developers");
  const [salary, setSalary] = useState<number | "">(120000);
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

  return (
    <main className="min-h-screen flex flex-col relative font-sans">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5 flex-grow w-full">
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
                H-1B Wage Map FY 2027 🇺🇸
              </h1>
              <p className="text-sm sm:text-base text-[var(--foreground-muted)] mt-1.5 max-w-3xl">
                Find your SOC code and instantly see county-level prevailing wage levels on the map.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SocialShare />
              <Link href="/find" className="btn-secondary !py-2 !px-4 !min-h-[36px] text-sm inline-flex items-center gap-1.5">
                Find SOC using AI <ArrowRight className="w-4 h-4" />
              </Link>
              
            </div>
          </div>
        </section>

        <section id="wage-map-workspace" className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-4">
            <div className="space-y-2">
              <label htmlFor="soc-search-input" className="text-sm font-bold text-gray-900 block">
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
              <p id="soc-search-help" className="text-xs text-[var(--foreground-muted)]">
                Don&apos;t know your SOC? Use <Link href="/find" className="text-[var(--brand-primary)] hover:underline">Find SOC tools</Link>.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="target-salary" className="text-sm font-bold text-gray-900 block">
                Target Base Salary
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium text-lg">$</span>
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
                  className="w-full pl-8 pr-4 py-3 bg-white border border-[var(--border-subtle)] focus:ring-2 focus:ring-[var(--brand-primary)] rounded-lg outline-none text-gray-900 font-medium text-lg transition-all"
                  placeholder="120,000"
                />
              </div>
              <p id="salary-help" className="text-xs text-[var(--foreground-muted)]">
                Base pay only (exclude bonus/RSU).
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-gray-50 p-1.5 shadow-sm" aria-label="County wage level map">
          <WageMap socCode={selectedSoc} jobTitle={jobTitle} userSalary={salary === "" ? 0 : salary} />
        </section>

        <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm sm:text-base font-semibold text-gray-900">
              Don&apos;t know your SOC code yet? Start with employer history first.
            </p>
            
          </div>
        </section>

        <section id="find-soc-employer" className="scroll-mt-24 rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Find SOC by Employer</h2>
              <p className="text-sm text-[var(--foreground-muted)] mt-1">
                Search your employer&apos;s historical LCA filings and select the closest SOC mapping.
              </p>
            </div>
            <Link href="/find" className="btn-secondary !py-2 !px-4 !min-h-[36px] text-sm inline-flex items-center gap-1.5">
              Find SOC using AI <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <LcaSearch />
        </section>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Data Sources</h2>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            Distinct official and reference sources used across this website.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href={DOL_WAGE_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[var(--border-subtle)] bg-gray-50/60 px-4 py-3 hover:border-[var(--brand-primary)] transition-colors">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900"><Landmark className="w-4 h-4 text-[var(--brand-primary)]" /> DOL FLC Data Center</span>
              <p className="text-xs text-gray-600 mt-1">Prevailing wage levels by SOC and county.</p>
            </a>
            <a href={DOL_PERFORMANCE_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[var(--border-subtle)] bg-gray-50/60 px-4 py-3 hover:border-[var(--brand-primary)] transition-colors">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900"><Database className="w-4 h-4 text-[var(--brand-primary)]" /> DOL Foreign Labor Performance Data</span>
              <p className="text-xs text-gray-600 mt-1">Historical certified LCA filings for employer mapping.</p>
            </a>
            <a href={FR_RULE_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[var(--border-subtle)] bg-gray-50/60 px-4 py-3 hover:border-[var(--brand-primary)] transition-colors">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900"><ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" /> Federal Register FY2027 Rule</span>
              <p className="text-xs text-gray-600 mt-1">Weighted selection framework and official rule details.</p>
            </a>
            <a href={FR_PROBABILITY_IMAGE_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[var(--border-subtle)] bg-gray-50/60 px-4 py-3 hover:border-[var(--brand-primary)] transition-colors">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900"><FileText className="w-4 h-4 text-[var(--brand-primary)]" /> Federal Register Probability Exhibit</span>
              <p className="text-xs text-gray-600 mt-1">Published weighted-entry probability table image.</p>
            </a>
          </div>
        </section>
      </div>

      <footer className="bg-white border-t border-[var(--border-subtle)] mt-6 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600 font-medium">Official wage data from U.S. Department of Labor.</p>
            <p className="text-xs text-gray-500 mt-1">Not legal advice. For informational purposes only.</p>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-sm font-medium text-gray-700">Developed by Akshay Jain</span>
            <a href="https://www.linkedin.com/in/akshayjain128/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--brand-primary)] transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="https://github.com/idealidler" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--brand-primary)] transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
        </div>
      }
    >
      <WageMapContent />
    </Suspense>
  );
}
