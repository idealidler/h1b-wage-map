"use client";

import { useState, useEffect, useRef, useMemo, KeyboardEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface Job { code: string; base_soc: string; title: string; }

interface JobSearchProps {
  onSelect: (soc: string, title: string) => void;
  initialValue?: string;
  inputId?: string;
  ariaDescribedBy?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function JobSearch({
  onSelect,
  initialValue = "",
  inputId = "soc-job-search-input",
  ariaDescribedBy,
}: JobSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debouncedQuery = useDebounce(query, 150);
  const listboxId = "soc-job-search-results";

  useEffect(() => {
    setIsLoading(true);
    fetch("/soc_data.json").then((res) => res.json()).then((data: Job[]) => setJobs(data))
      .catch((err) => console.error("Failed to load SOC data:", err)).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { if (initialValue) setQuery(initialValue); }, [initialValue]);

  const filtered = useMemo(() => {
    if (debouncedQuery.length < 2 || debouncedQuery === initialValue) return [];
    const lowerQuery = debouncedQuery.toLowerCase();
    return jobs
      .filter((j) => (j.title && j.title.toLowerCase().includes(lowerQuery)) || (j.code && j.code.includes(lowerQuery)))
      .sort((a, b) => {
         const aStarts = a.title.toLowerCase().startsWith(lowerQuery);
         const bStarts = b.title.toLowerCase().startsWith(lowerQuery);
         if (aStarts && !bStarts) return -1;
         if (!aStarts && bStarts) return 1;
         return 0;
      }).slice(0, 15);
  }, [debouncedQuery, jobs, initialValue]);

  useEffect(() => {
    setIsOpen(query.trim().length >= 2 && query !== initialValue);
    setActiveIndex(-1);
  }, [query, initialValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FIXED: Hitting Enter now auto-selects the first result!
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) handleSelect(filtered[activeIndex]);
      else if (filtered.length > 0) handleSelect(filtered[0]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);

  const handleSelect = (job: Job) => {
    const formattedCode = job.code.includes('.') ? job.code : `${job.code}.00`;
    setQuery(`${formattedCode} - ${job.title}`); 
    onSelect(formattedCode, job.title); 
    setIsOpen(false);
  };

  return (
    <div className="relative w-full z-[100]" ref={wrapperRef}>
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--brand-primary)] animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        )}
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-describedby={ariaDescribedBy}
          placeholder="Search by role or SOC code (e.g. Software Developers or 15-1252)"
          className="w-full pl-12 pr-11 py-3.5 min-h-[48px] border border-[var(--border-subtle)] rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] focus:outline-none text-[15px] text-gray-900 transition-all font-medium placeholder:text-gray-400"
          value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => { if (filtered.length > 0) setIsOpen(true); }}
        />
        {query.length > 0 && !isLoading && (
            <button
              aria-label="Clear search"
              onClick={() => { setQuery(""); setIsOpen(false); onSelect("", ""); setActiveIndex(-1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
            >
                <X className="h-4 w-4" />
            </button>
        )}
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          ref={listRef}
          className="absolute w-full bg-white mt-2 border border-[var(--border-subtle)] rounded-xl shadow-xl max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 z-[100]"
        >
          {filtered.length > 0 ? (
            <>
              <li className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50/70">
                Top matches
              </li>
              {filtered.map((job, idx) => {
                const formattedCode = job.code.includes('.') ? job.code : `${job.code}.00`;
                return (
                  <li
                    key={`${job.code}-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={`px-4 py-3.5 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${idx === activeIndex ? "bg-blue-50 text-blue-900" : "hover:bg-blue-50/70 text-gray-700"}`}
                    onClick={() => handleSelect(job)}
                  >
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-semibold text-[15px] text-gray-900">{job.title}</span>
                      <div className="text-xs text-[var(--brand-primary)] font-mono font-semibold text-right min-w-[72px] bg-blue-50 border border-blue-100 px-2 py-1 rounded-md">
                        {formattedCode}
                      </div>
                    </div>
                  </li>
                );
              })}
            </>
          ) : (
            <li className="px-4 py-4 text-sm text-gray-600 leading-relaxed">
              No matches yet. Try a broader role keyword (for example, "software", "analyst", or "engineer").
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
