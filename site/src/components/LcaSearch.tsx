"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Database,
  FileSearch,
  ListFilter,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
  onSelectSoc?: (soc: string, title: string) => void;
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

export default function LcaSearch({ inputId = "employer-search-input", spotlight = false, onSelectSoc }: LcaSearchProps) {
  const router = useRouter();

  const [dataCache, setDataCache] = useState<CompanyMap>({});
  const [loadedShards, setLoadedShards] = useState<Set<string>>(new Set());

  const [companySearch, setCompanySearch] = useState("");
  const [isCompanyInputFocused, setIsCompanyInputFocused] = useState(false);
  const [activeCompanyIndex, setActiveCompanyIndex] = useState(-1);
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
      const clearTimer = setTimeout(() => {
        setCompanyError(null);
        setLoadingShard(null);
      }, 0);
      return () => clearTimeout(clearTimer);
    }

    const key = getShardKey(query);
    if (loadedShards.has(key)) return;

    const startTimer = setTimeout(() => {
      setLoadingShard(key);
      setCompanyError(null);
    }, 0);

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

    return () => {
      clearTimeout(startTimer);
      abortController.abort();
    };
  }, [debouncedCompanySearch, loadedShards]);

  useEffect(() => {
    const resetTimer = setTimeout(() => setActiveCompanyIndex(-1), 0);
    return () => clearTimeout(resetTimer);
  }, [normalizedCompanySearch]);

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
        Number.isFinite(minYear) && Number.isFinite(maxYear) ? `${minYear}–${maxYear}` : "2022–2026",
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
    const resetTimer = setTimeout(() => setVisibleCount(8), 0);
    return () => clearTimeout(resetTimer);
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

  const handleCompanyKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || filteredCompanies.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCompanyIndex((current) => (current + 1) % filteredCompanies.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCompanyIndex((current) => (current <= 0 ? filteredCompanies.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeCompanyIndex >= 0) {
      event.preventDefault();
      openCompany(filteredCompanies[activeCompanyIndex].name);
    } else if (event.key === "Escape") {
      setIsCompanyInputFocused(false);
    }
  };

  const goToWageMap = (option: SocOption) => {
    const soc = formatSocCode(option.s);
    onSelectSoc?.(soc, option.t);

    const params = new URLSearchParams(window.location.search);
    params.set("soc", soc);
    params.set("title", option.t);
    router.push(`/?${params.toString()}`, { scroll: false });

    requestAnimationFrame(() => {
      document.getElementById("wage-map-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="w-full animate-in fade-in duration-500" aria-label="Employer LCA research">
      {!selectedCompany ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-4">
            <div className="relative group" ref={searchContainerRef} role="search">
              <label htmlFor={inputId} className="mb-2 block text-sm font-bold text-[var(--foreground)]">Company name</label>
              <div
                className={`relative flex items-center overflow-hidden rounded-[var(--radius-control)] border bg-white transition-all duration-300 shadow-[var(--shadow-surface)] ${
                  spotlight
                    ? "border-[var(--brand-primary)] ring-4 ring-[var(--ring-subtle)]"
                    : "border-[var(--border-subtle)] focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--ring-subtle)]"
                }`}
              >
                <div className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-muted)]">
                  {isSearchingCompanies ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
                  ) : (
                    <Search className="h-5 w-5 text-[var(--brand-primary)]" />
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
                  aria-busy={isSearchingCompanies}
                  aria-activedescendant={activeCompanyIndex >= 0 ? `company-option-${activeCompanyIndex}` : undefined}
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  onFocus={() => setIsCompanyInputFocused(true)}
                  onKeyDown={handleCompanyKeyDown}
                  placeholder="Try Google, Deloitte, Microsoft..."
                  className="min-h-[64px] w-full border-0 bg-transparent px-3 py-4 text-base font-semibold text-[var(--foreground)] outline-none focus:outline-none focus:ring-0 focus-visible:outline-none placeholder:text-[var(--foreground-muted)]"
                />

                {companySearch && (
                  <button
                    type="button"
                    onClick={clearCompanySearch}
                    className="mr-3 rounded-full p-2 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    aria-label="Clear employer search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    id={companyListboxId}
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[360px] overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-white/95 p-1.5 shadow-lg backdrop-blur-xl"
                  >
                    {isSearchingCompanies && (
                      <li className="flex items-center gap-2 px-4 py-5 text-sm font-medium text-[var(--foreground-muted)]" role="status">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-primary)]" />
                        Loading employer records...
                      </li>
                    )}
                    {filteredCompanies.length > 0 && !isSearchingCompanies && (
                      <li className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                        Matching employers
                      </li>
                    )}
                    {filteredCompanies.map((company, index) => (
                      <li key={company.name} id={`company-option-${index}`} role="option" aria-selected={activeCompanyIndex === index}>
                        <button
                          type="button"
                          onClick={() => openCompany(company.name)}
                          className={`group flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${activeCompanyIndex === index ? "bg-[var(--brand-primary-muted)]" : "hover:bg-[var(--surface-muted)]"}`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Building2 className="h-5 w-5 shrink-0 text-[var(--foreground-muted)] transition-colors group-hover:text-[var(--brand-primary)]" />
                            <div className="min-w-0">
                              <span className="block truncate text-[15px] font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--brand-primary)]">
                                {company.name}
                              </span>
                              <span className="text-xs font-medium text-[var(--foreground-muted)]">
                                {company.filings.toLocaleString()} certified filings
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--foreground-muted)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--brand-primary)]" />
                        </button>
                      </li>
                    ))}

                    {filteredCompanies.length === 0 && normalizedCompanySearch.length >= 2 && !isSearchingCompanies && (
                      <li className="px-4 py-6 text-center text-sm font-medium text-[var(--foreground-muted)]">
                        {companyError ?? "No company matches found. Try a shorter or broader employer name."}
                      </li>
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Database, title: "Certified LCA records", body: "Searches historical employer filings, not guessed job categories." },
                { icon: Briefcase, title: "Role title matching", body: "Groups the job titles an employer has used in filings." },
                { icon: FileSearch, title: "SOC evidence", body: "Shows each SOC code, filing count, and filing years." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-alt)] p-4">
                  <item.icon className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold leading-tight text-[var(--foreground)]">{item.title}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-[var(--foreground-muted)]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-alt)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-primary)]">What you will see</p>
            <div className="mt-4 space-y-3">
              {[
                ["Employer filing volume", "How much certified LCA history is available."],
                ["Job titles filed", "The exact titles that appeared in records."],
                ["SOC mapping mix", "Where a role was mapped when filings varied."],
                ["Filing years", "Recent years represented in the source data."],
              ].map(([title, body]) => (
                <div key={title} className="border-t border-[var(--border-subtle)] pt-3 first:border-t-0 first:pt-0">
                  <p className="text-sm font-bold text-[var(--foreground)]">{title}</p>
                  <p className="text-xs font-medium leading-5 text-[var(--foreground-muted)]">{body}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl animate-in slide-in-from-bottom-4 space-y-4 duration-500">
          <div className="sticky top-2 z-20 rounded-[var(--radius-surface)] border border-[var(--border-subtle)] bg-[var(--surface-floating)] p-4 shadow-[var(--shadow-floating)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany("");
                    setTitleSearch("");
                    setExpandedJob(null);
                  }}
                  className="group mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-primary-hover)]"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  Change company
                </button>
                <h3 className="truncate text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">{selectedCompany}</h3>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[var(--foreground-muted)]">
                  Compare role titles this employer filed and pick the SOC mapping that best matches your position.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 lg:min-w-[430px]">
                {[
                  { label: "Filings", value: companyStats?.totalFilings.toLocaleString(), icon: BarChart3 },
                  { label: "Roles", value: companyStats?.uniqueRoles.toLocaleString(), icon: Briefcase },
                  { label: "Years", value: companyStats?.coverageYears, icon: CalendarDays },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-3">
                    <stat.icon className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden="true" />
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">{stat.label}</p>
                    <p className="mt-0.5 truncate text-lg font-bold text-[var(--foreground)]">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-surface)] border border-[var(--border-subtle)] bg-[var(--background-alt)] p-3 sm:p-4" aria-label="Employer role filters">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
              <label className="relative group block">
                <span className="sr-only">Filter role titles</span>
                <div className="relative flex items-center overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white transition-all duration-300 focus-within:border-[var(--brand-primary)] focus-within:ring-4 focus-within:ring-[var(--ring-subtle)]">
                  <Search className="ml-4 h-5 w-5 shrink-0 text-[var(--foreground-muted)] transition-colors group-focus-within:text-[var(--brand-primary)]" />
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    placeholder="Filter by role title, for example Software Engineer"
                    className="min-h-12 w-full border-0 bg-transparent px-3 py-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:ring-0 placeholder:text-[var(--foreground-muted)]"
                  />
                  {titleSearch && (
                    <button
                      type="button"
                      onClick={() => setTitleSearch("")}
                      className="mr-3 rounded-full p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                      aria-label="Clear role title filter"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </label>

              <label className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white px-3">
                <SlidersHorizontal className="h-4 w-4 text-[var(--foreground-muted)]" />
                <span className="sr-only">Sort titles</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="bg-transparent text-sm font-bold text-[var(--foreground)] outline-none"
                  aria-label="Sort titles"
                >
                  <option value="filings">Highest filings</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </label>

              <p className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white px-3 text-sm font-bold text-[var(--foreground-muted)]" aria-live="polite">
                <ListFilter className="h-4 w-4" aria-hidden="true" />
                {preparedTitles.length.toLocaleString()} role{preparedTitles.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border-subtle)] bg-white" aria-live="polite">
            <div className="hidden grid-cols-[minmax(0,1fr)_150px_150px_44px] gap-4 border-b border-[var(--border-subtle)] bg-[var(--background-alt)] px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] md:grid">
              <span>Role title</span>
              <span>Likely SOC</span>
              <span>Filings</span>
              <span className="sr-only">Expand</span>
            </div>

            {visibleTitles.map((item) => {
              const isExpanded = expandedJob === item.title;
              return (
                <div key={item.title} className="border-b border-[var(--border-subtle)] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setExpandedJob(isExpanded ? null : item.title)}
                    className={`group grid w-full gap-3 px-4 py-4 text-left transition-colors md:grid-cols-[minmax(0,1fr)_150px_150px_44px] md:items-center ${isExpanded ? "bg-[var(--brand-primary-muted)]" : "hover:bg-[var(--background-alt)]"}`}
                    aria-expanded={isExpanded}
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white text-[var(--foreground-muted)]">
                          <Briefcase className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="break-words text-base font-bold leading-tight text-[var(--foreground)]">{item.title}</h4>
                          <p className="mt-1 text-xs font-medium leading-5 text-[var(--foreground-muted)]">
                            Primary mapping confidence: <span className="font-bold text-[var(--foreground)]">{item.dominancePct.toFixed(0)}%</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className="w-fit rounded-md border border-[var(--border-subtle)] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[var(--foreground)]">
                      {formatSocCode(item.primaryOption.s)}
                    </span>
                    <span className="text-sm font-bold text-[var(--foreground-muted)]">
                      {item.totalFilings.toLocaleString()} filing{item.totalFilings !== 1 ? "s" : ""}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--foreground-muted)] transition-colors group-hover:text-[var(--brand-primary)]">
                      <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? "rotate-180 text-[var(--brand-primary)]" : ""}`} aria-hidden="true" />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
                      >
                        <div className="space-y-2 bg-[var(--background-alt)] px-4 pb-4 pt-1">
                          <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">SOC mappings filed for this title</p>
                            <p className="text-xs font-medium text-[var(--foreground-muted)]">Choose one to compare wage levels</p>
                          </div>

                          {item.options.map((option, optionIndex) => (
                            <button
                              key={`${item.title}-${option.s}-${optionIndex}`}
                              type="button"
                              onClick={() => goToWageMap(option)}
                              className="group/option grid w-full gap-3 rounded-xl border border-[var(--border-subtle)] bg-white p-4 text-left transition-all duration-200 hover:border-[var(--brand-primary)] hover:shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--foreground)]">
                                    SOC {formatSocCode(option.s)}
                                  </span>
                                  <span className="text-xs font-bold text-[var(--foreground-muted)]">
                                    {option.n.toLocaleString()} filing{option.n !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                <p className="mt-2 break-words text-sm font-bold leading-5 text-[var(--foreground)] transition-colors group-hover/option:text-[var(--brand-primary)] sm:text-[15px]">{option.t}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">Years</span>
                                  {sortYearsDesc(option.y).map((year) => (
                                    <span
                                      key={`${option.s}-${option.t}-${year}`}
                                      className="inline-flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--background-alt)] px-2 py-0.5 text-[11px] font-semibold text-[var(--foreground-muted)]"
                                    >
                                      {year}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-bold text-white transition-colors group-hover/option:bg-[var(--brand-primary-hover)]">
                                Open map
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {preparedTitles.length === 0 && (
              <div className="px-4 py-12 text-center">
                <Search className="mx-auto h-9 w-9 text-[var(--border-strong)]" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-[var(--foreground)]">No matching role titles</p>
                <p className="mx-auto mt-1 max-w-sm text-sm font-medium leading-6 text-[var(--foreground-muted)]">
                  Nothing matched &quot;{titleSearch}&quot;. Clear the filter or try a shorter role keyword.
                </p>
              </div>
            )}
          </div>

          {hasMoreTitles && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="btn-secondary !rounded-full !px-8"
              >
                Show more roles
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
