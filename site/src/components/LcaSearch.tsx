"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface SocOption {
  s: string;
  t: string;
  n: number;
  y: number[];
  o?: string[];
}

interface CompanyMap {
  [company: string]: {
    [title: string]: SocOption[];
  };
}

interface TitleInsight {
  title: string;
  options: SocOption[];
  totalFilings: number;
  primaryOption: SocOption;
  dominancePct: number;
}

type SortMode = "filings" | "alphabetical";

interface LcaSearchProps {
  inputId?: string;
  spotlight?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function getShardKey(query: string): string {
  const prefix = query.slice(0, 2).toUpperCase();
  if (/^[A-Z]{2}$/.test(prefix)) return prefix;
  if (/^[A-Z]/.test(prefix)) return `${prefix[0]}_`;
  return "00";
}

function formatSocCode(code: string): string {
  return code.includes(".") ? code : `${code}.00`;
}

function sortYearsDesc(years: number[]): number[] {
  return [...years].filter(Number.isFinite).sort((a, b) => b - a);
}

export default function LcaSearch({ inputId = "employer-search-input", spotlight = false }: LcaSearchProps) {
  const router = useRouter();

  const [dataCache, setDataCache] = useState<CompanyMap>({});
  const [loadedShards, setLoadedShards] = useState<Set<string>>(new Set());

  const [companySearch, setCompanySearch] = useState("");
  const [isCompanyInputFocused, setIsCompanyInputFocused] = useState(false);
  const [loadingShard, setLoadingShard] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [selectedCompany, setSelectedCompany] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const [sortMode, setSortMode] = useState<SortMode>("filings");
  const [visibleCount, setVisibleCount] = useState(8);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const companyListboxId = "company-search-results";

  const debouncedCompanySearch = useDebounce(companySearch, 200);
  const normalizedCompanySearch = companySearch.trim();

  const currentShard =
    normalizedCompanySearch.length >= 2 ? getShardKey(normalizedCompanySearch) : null;
  const isSearchingCompanies = loadingShard !== null && loadingShard === currentShard;
  const isDropdownOpen = isCompanyInputFocused && normalizedCompanySearch.length >= 2;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsCompanyInputFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!spotlight) return;
    companyInputRef.current?.focus();
  }, [spotlight]);

  useEffect(() => {
    const query = debouncedCompanySearch.trim();
    if (query.length < 2) {
      setCompanyError(null);
      setLoadingShard(null);
      return;
    }

    const key = getShardKey(query);
    if (loadedShards.has(key)) return;

    setLoadingShard(key);
    setCompanyError(null);

    const abortController = new AbortController();

    fetch(`/db/${key}.json`, { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load employer data");
        return res.json();
      })
      .then((json: CompanyMap) => {
        setDataCache((prev) => ({ ...prev, ...json }));
        setLoadedShards((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setCompanyError("Could not load employer data right now. Please try again.");
      })
      .finally(() => {
        setLoadingShard((prev) => (prev === key ? null : prev));
      });

    return () => abortController.abort();
  }, [debouncedCompanySearch, loadedShards]);

  const filteredCompanies = useMemo(() => {
    if (!normalizedCompanySearch || normalizedCompanySearch.length < 2) return [];

    const searchUpper = normalizedCompanySearch.toUpperCase();

    return Object.keys(dataCache)
      .filter((company) => company.includes(searchUpper))
      .map((companyName) => {
        const totalFilings = Object.values(dataCache[companyName]).reduce(
          (acc, titleOptions) => acc + titleOptions.reduce((sum, option) => sum + option.n, 0),
          0
        );
        return { name: companyName, filings: totalFilings };
      })
      .sort((a, b) => b.filings - a.filings)
      .slice(0, 8);
  }, [dataCache, normalizedCompanySearch]);

  const companyStats = useMemo(() => {
    if (!selectedCompany || !dataCache[selectedCompany]) return null;

    const data = dataCache[selectedCompany];
    const titles = Object.keys(data);

    let totalFilings = 0;
    let minYear = Infinity;
    let maxYear = -Infinity;

    for (const title of titles) {
      for (const option of data[title]) {
        totalFilings += option.n;

        option.y.forEach((year) => {
          if (Number.isFinite(year)) {
            minYear = Math.min(minYear, year);
            maxYear = Math.max(maxYear, year);
          }
        });
      }
    }

    return {
      totalFilings,
      uniqueRoles: titles.length,
      coverageYears:
        Number.isFinite(minYear) && Number.isFinite(maxYear) ? `${minYear}–${maxYear}` : "2022–2025",
    };
  }, [selectedCompany, dataCache]);

  const preparedTitles = useMemo(() => {
    if (!selectedCompany || !dataCache[selectedCompany]) return [];

    const companyData = dataCache[selectedCompany];
    const upperQuery = titleSearch.trim().toUpperCase();
    const titles = Object.keys(companyData).filter((title) => title.includes(upperQuery));

    const mapped = titles.map<TitleInsight>((title) => {
      const options = [...companyData[title]].sort((a, b) => b.n - a.n);
      const totalFilings = options.reduce((sum, option) => sum + option.n, 0);
      const primaryOption = options[0];
      const dominancePct = totalFilings > 0 ? (primaryOption.n / totalFilings) * 100 : 0;
      return { title, options, totalFilings, primaryOption, dominancePct };
    });

    const sorted = [...mapped].sort((a, b) => {
      if (sortMode === "alphabetical") return a.title.localeCompare(b.title);
      return b.totalFilings - a.totalFilings;
    });

    return sorted;
  }, [selectedCompany, dataCache, titleSearch, sortMode]);

  const visibleTitles = preparedTitles.slice(0, visibleCount);
  const hasMoreTitles = preparedTitles.length > visibleCount;

  useEffect(() => {
    setVisibleCount(8);
  }, [selectedCompany, titleSearch, sortMode]);

  const openCompany = (companyName: string) => {
    setSelectedCompany(companyName);
    setExpandedJob(null);
    setTitleSearch("");
    setCompanySearch("");
    setIsCompanyInputFocused(false);
  };

  const clearCompanySearch = () => {
    setCompanySearch("");
    setCompanyError(null);
  };

  const goToWageMap = (option: SocOption) => {
    router.push(`/?soc=${formatSocCode(option.s)}&title=${encodeURIComponent(option.t)}`);
  };

  return (
    <section className="w-full space-y-6 animate-in fade-in duration-500">
      {!selectedCompany ? (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="relative group" ref={searchContainerRef}>
            
            {/* Modernized Search Input */}
            <div
              className={`relative flex items-center bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${
                spotlight
                  ? "border-[var(--brand-primary)] ring-4 ring-[var(--ring-subtle)]"
                  : "border-[var(--border-subtle)] focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--ring-subtle)]"
              }`}
            >
              <div className="ml-4 shrink-0 flex items-center justify-center w-5 h-5">
                {isSearchingCompanies ? (
                  <Loader2 className="w-5 h-5 text-[var(--brand-primary)] animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-[var(--foreground-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
                )}
              </div>

              <input
                id={inputId}
                ref={companyInputRef}
                type="text"
                role="combobox"
                aria-expanded={isDropdownOpen}
                aria-controls={companyListboxId}
                aria-autocomplete="list"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                onFocus={() => setIsCompanyInputFocused(true)}
                placeholder="Search employer (e.g. Google, Deloitte, Microsoft)"
                className="w-full py-4 px-3 bg-transparent border-0 outline-none focus:ring-0 text-[var(--foreground)] font-medium placeholder:text-[var(--foreground-muted)] min-h-[54px]"
              />

              {companySearch && (
                <button
                  type="button"
                  onClick={clearCompanySearch}
                  className="mr-3 p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] rounded-full transition-colors"
                  aria-label="Clear employer search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Framer Motion Dropdown */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  id={companyListboxId}
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl shadow-lg z-50 overflow-hidden p-1.5 flex flex-col gap-0.5"
                >
                  {filteredCompanies.length > 0 && (
                    <li className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest ml-1">
                      Top Employers
                    </li>
                  )}
                  {filteredCompanies.map((company) => (
                    <li key={company.name} role="option">
                      <button
                        type="button"
                        onClick={() => openCompany(company.name)}
                        className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between hover:bg-[var(--surface-muted)] transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-[var(--foreground-muted)] group-hover:text-[var(--brand-primary)] transition-colors" />
                          <div>
                            <span className="font-semibold text-[var(--foreground)] block group-hover:text-[var(--brand-primary)] transition-colors text-[15px]">
                              {company.name}
                            </span>
                            <span className="text-xs text-[var(--foreground-muted)]">
                              {company.filings.toLocaleString()} certified filings
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[var(--brand-primary)] transition-all duration-300" />
                      </button>
                    </li>
                  ))}

                  {filteredCompanies.length === 0 && normalizedCompanySearch.length >= 2 && !isSearchingCompanies && (
                    <li className="px-4 py-6 text-sm text-center text-[var(--foreground-muted)] font-medium">
                      {companyError ?? "No company matches found. Try a broader search."}
                    </li>
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
          
          {/* Company Header Card */}
          <div className="sticky top-2 z-20 rounded-2xl border border-[var(--border-subtle)] bg-white/80 backdrop-blur-xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all">
            <button
              type="button"
              onClick={() => {
                setSelectedCompany("");
                setTitleSearch("");
                setExpandedJob(null);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] transition-colors mb-4 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Employer Search
            </button>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">{selectedCompany}</h2>
                <p className="text-[var(--foreground-muted)] mt-1.5 font-medium">
                  Select a role title to view available SOC mappings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                <div className="rounded-xl bg-[var(--surface-muted)] px-4 py-3.5 text-center border border-[var(--border-subtle)]">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)]">Total Filings</p>
                  <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{companyStats?.totalFilings.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-[var(--surface-muted)] px-4 py-3.5 text-center border border-[var(--border-subtle)]">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--foreground-muted)]">Unique Roles</p>
                  <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{companyStats?.uniqueRoles.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
              <div className="relative group">
                <div className="relative flex items-center bg-[var(--background-alt)] rounded-xl border border-transparent focus-within:border-[var(--brand-primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[var(--ring-subtle)] transition-all duration-300 overflow-hidden">
                  <Search className="w-5 h-5 text-[var(--foreground-muted)] ml-4 shrink-0 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    placeholder="Filter role titles..."
                    className="w-full py-3 px-3 bg-transparent border-0 outline-none focus:ring-0 font-medium text-[var(--foreground)] transition-all placeholder:text-[var(--foreground-muted)]"
                  />
                  {titleSearch && (
                    <button
                      type="button"
                      onClick={() => setTitleSearch("")}
                      className="mr-3 p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2.5 bg-[var(--background-alt)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer">
                <SlidersHorizontal className="w-4 h-4 text-[var(--foreground-muted)]" />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="text-sm font-semibold text-[var(--foreground)] bg-transparent outline-none cursor-pointer"
                  aria-label="Sort titles"
                >
                  <option value="filings">Sort: Highest filings</option>
                  <option value="alphabetical">Sort: Alphabetical</option>
                </select>
              </div>

              <p className="text-sm font-medium text-[var(--foreground-muted)] justify-self-end px-2">
                {preparedTitles.length.toLocaleString()} role{preparedTitles.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Role List Accordion */}
          <div className="space-y-3" aria-live="polite">
            {visibleTitles.map((item, index) => {
              const isExpanded = expandedJob === item.title;
              return (
                <div
                  key={item.title}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isExpanded
                      ? "border-[var(--brand-primary)] bg-white shadow-[0_8px_30px_rgba(37,99,235,0.06)] ring-1 ring-[var(--brand-primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--background)] hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedJob(isExpanded ? null : item.title)}
                    className="w-full p-5 text-left group outline-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl border transition-colors ${isExpanded ? 'bg-[var(--brand-primary-muted)] border-[var(--brand-primary-muted)] text-[var(--brand-primary)]' : 'border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] group-hover:bg-white'}`}>
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--foreground)] text-base sm:text-lg leading-tight">{item.title}</h3>
                          <p className="text-sm text-[var(--foreground-muted)] mt-1 font-medium">
                            Commonly mapped to <span className="text-[var(--foreground)] font-semibold">{formatSocCode(item.primaryOption.s)}</span> ({item.dominancePct.toFixed(0)}%)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 sm:mt-0">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-[var(--foreground-muted)]">
                          {item.totalFilings.toLocaleString()} filings
                        </span>
                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? "rotate-180 text-[var(--brand-primary)]" : "text-[var(--foreground-muted)] group-hover:text-[var(--foreground)]"}`} />
                      </div>
                    </div>
                  </button>

                  {/* Framer Motion Fluid Height Accordion */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                      >
                        <div className="px-5 pb-5 pt-2">
                          <div className="rounded-xl bg-[var(--background-alt)] border border-[var(--border-subtle)] p-4 space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] ml-1">Available SOC Mappings</p>

                            {item.options.map((option, optionIndex) => (
                              <button
                                key={`${item.title}-${option.s}-${optionIndex}`}
                                type="button"
                                onClick={() => goToWageMap(option)}
                                className="w-full rounded-xl bg-white p-4 text-left border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group/btn"
                              >
                                <div>
                                  <div className="inline-flex items-center gap-2 mb-1.5">
                                    <span className="bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border-subtle)] font-mono font-bold text-xs px-2.5 py-1 rounded-md">
                                      SOC {formatSocCode(option.s)}
                                    </span>
                                    <span className="text-xs text-[var(--foreground-muted)] font-semibold">
                                      {option.n.toLocaleString()} filings
                                    </span>
                                  </div>
                                  <p className="text-sm sm:text-base font-bold text-[var(--foreground)] group-hover/btn:text-[var(--brand-primary)] transition-colors">{option.t}</p>
                                  
                                  {/* Year Tags */}
                                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] mr-1">Filed in</span>
                                    {sortYearsDesc(option.y).map((year) => (
                                      <span
                                        key={`${option.s}-${option.t}-${year}`}
                                        className="inline-flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--foreground-muted)]"
                                      >
                                        {year}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface-muted)] text-[var(--foreground-muted)] group-hover/btn:bg-[var(--brand-primary)] group-hover/btn:text-white transition-all duration-300 shrink-0">
                                  <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {hasMoreTitles && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 8)}
                  className="btn-secondary !rounded-full !px-8"
                >
                  Show More Roles
                </button>
              </div>
            )}

            {preparedTitles.length === 0 && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-alt)] px-4 py-12 text-center text-[var(--foreground-muted)] font-medium">
                <Search className="w-8 h-8 mx-auto text-[var(--border-strong)] mb-3" />
                No role titles match &quot;<span className="text-[var(--foreground)] font-semibold">{titleSearch}</span>&quot;.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}