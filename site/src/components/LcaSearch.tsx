"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  X,
  Heading1,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function LcaSearch() {
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
          <div className="relative" ref={searchContainerRef}>
            <div className="relative flex items-center bg-white rounded-2xl border border-[var(--border-subtle)] shadow-sm focus-within:ring-2 focus-within:ring-[var(--brand-primary)] focus-within:border-[var(--brand-primary)] transition-all overflow-hidden">
              <div className="ml-4 shrink-0 flex items-center justify-center w-5 h-5">
                {isSearchingCompanies ? (
                  <Loader2 className="w-5 h-5 text-[var(--brand-primary)] animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-gray-400" />
                )}
              </div>

              <input
                type="text"
                role="combobox"
                aria-expanded={isDropdownOpen}
                aria-controls={companyListboxId}
                aria-autocomplete="list"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                onFocus={() => setIsCompanyInputFocused(true)}
                placeholder="Search employer (e.g. Google, Deloitte, Microsoft)"
                className="w-full py-4 px-3 bg-transparent border-0 outline-none focus:ring-0 text-gray-900 font-medium placeholder:text-gray-400 min-h-[54px]"
              />

              {companySearch && (
                <button
                  type="button"
                  onClick={clearCompanySearch}
                  className="mr-3 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Clear employer search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isDropdownOpen && (
              <ul
                id={companyListboxId}
                role="listbox"
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-[var(--border-subtle)] rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-gray-100"
              >
                {filteredCompanies.map((company) => (
                  <li key={company.name} role="option">
                    <button
                      type="button"
                      onClick={() => openCompany(company.name)}
                      className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-blue-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors" />
                        <div>
                          <span className="font-bold text-gray-900 block group-hover:text-[var(--brand-primary)] transition-colors">
                            {company.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {company.filings.toLocaleString()} certified filings
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--brand-primary)] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}

                {filteredCompanies.length === 0 && normalizedCompanySearch.length >= 2 && !isSearchingCompanies && (
                  <li className="px-4 py-4 text-sm text-center text-gray-500 font-medium bg-gray-50/50">
                    {companyError ?? "No company matches found. Try a broader search."}
                  </li>
                )}
              </ul>
            )}
          </div>

        </div>
      ) : (
        <div className="space-y-4 max-w-5xl mx-auto">
          <div className="sticky top-2 z-20 rounded-2xl border border-[var(--border-subtle)] bg-white/95 backdrop-blur p-5 sm:p-6 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setSelectedCompany("");
                setTitleSearch("");
                setExpandedJob(null);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:underline mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Employer Search
            </button>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedCompany}</h2>
                <p className="text-gray-600 mt-1">
                  Pick your role title to view available SOC mappings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Total Filings</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{companyStats?.totalFilings.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Unique Roles</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{companyStats?.uniqueRoles.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
              <div className="relative">
                <div className="relative flex items-center bg-white rounded-xl border border-[var(--border-subtle)] shadow-sm focus-within:ring-2 focus-within:ring-[var(--brand-primary)] transition-all overflow-hidden">
                  <Search className="w-5 h-5 text-gray-400 ml-4 shrink-0" />
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    placeholder="Filter role titles..."
                    className="w-full py-3 px-3 bg-transparent border-0 outline-none focus:ring-0 font-medium text-gray-900 transition-all placeholder:text-gray-400"
                  />
                  {titleSearch && (
                    <button
                      type="button"
                      onClick={() => setTitleSearch("")}
                      className="mr-3 p-1.5 text-gray-400 hover:text-gray-700 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2.5 bg-white">
                <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="text-sm font-medium bg-transparent outline-none"
                  aria-label="Sort titles"
                >
                  <option value="filings">Sort: Highest filings</option>
                  <option value="alphabetical">Sort: Alphabetical</option>
                </select>
              </div>

              <p className="text-sm text-gray-500 justify-self-end">
                {preparedTitles.length.toLocaleString()} role{preparedTitles.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="space-y-3" aria-live="polite">
            {visibleTitles.map((item, index) => {
              const isExpanded = expandedJob === item.title;
              return (
                <div
                  key={item.title}
                  className={`rounded-xl border transition-all duration-300 ${
                    isExpanded
                      ? "border-blue-200 bg-white shadow-md"
                      : "border-[var(--border-subtle)] bg-gray-50/45 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedJob(isExpanded ? null : item.title)}
                    className="w-full p-4 sm:p-5 text-left group outline-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-base sm:text-lg leading-tight">{item.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Most commonly mapped to: {formatSocCode(item.primaryOption.s)} ({item.dominancePct.toFixed(0)}% of filings)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                          {item.totalFilings.toLocaleString()} filings
                        </span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180 text-[var(--brand-primary)]" : ""}`} />
                      </div>
                    </div>
                  </button>

                  <div
                    className={`transition-all duration-300 overflow-hidden ${isExpanded ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"}`}
                  >
                    <div className="ml-4 sm:ml-6 mr-4 sm:mr-6 mb-4 sm:mb-5 rounded-xl bg-blue-50/45 px-3 sm:px-4 py-3 space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Available SOC Mappings</p>

                      {item.options.map((option, optionIndex) => (
                        <button
                          key={`${item.title}-${option.s}-${optionIndex}`}
                          type="button"
                          onClick={() => goToWageMap(option)}
                          className="w-full rounded-lg bg-white px-3.5 py-3 text-left border border-blue-100 hover:border-blue-300 transition-all duration-200 flex items-center justify-between gap-3"
                          style={{
                            animationDelay: `${index * 30 + optionIndex * 25}ms`,
                          }}
                        >
                          <div>
                            <div className="inline-flex items-center gap-2 mb-1.5">
                              <span className="bg-blue-600 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-full">
                                SOC {formatSocCode(option.s)}
                              </span>
                              <span className="text-xs text-gray-500 font-semibold">
                                {option.n.toLocaleString()} filings
                              </span>
                            </div>
                            <p className="text-sm sm:text-base font-semibold text-gray-900">{option.t}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mr-1">Filed in</span>
                              {sortYearsDesc(option.y).map((year) => (
                                <span
                                  key={`${option.s}-${option.t}-${year}`}
                                  className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800"
                                >
                                  {year}
                                </span>
                              ))}
                            </div>
                          </div>
                          

                          <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-primary)] whitespace-nowrap">
                            Open Wage Map
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMoreTitles && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 8)}
                  className="btn-secondary !min-h-[40px] !py-2 !px-5 text-sm"
                >
                  Show More Roles
                </button>
              </div>
            )}

            {preparedTitles.length === 0 && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-gray-50 px-4 py-8 text-center text-sm text-gray-600 font-medium">
                <Search className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                No role titles match &quot;{titleSearch}&quot;.
              </div>
            )}
          </div>
        </div>
      )}

    </section>
  );
}
