"use client";

import { useState, useEffect, useRef, useMemo, KeyboardEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      const activeEl = listRef.current.children[activeIndex + 1] as HTMLElement;
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
      <div className="relative group">
        {isLoading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-muted)] animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors duration-200" />
        )}
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-describedby={ariaDescribedBy}
          placeholder="Search by role or SOC code (e.g. Software Developers)"
          className="w-full pl-12 pr-11 py-3.5 min-h-[52px] border border-[var(--border-subtle)] rounded-2xl bg-white shadow-sm focus:ring-4 focus:ring-[var(--ring-subtle)] focus:border-[var(--brand-primary)] focus:outline-none text-[15px] text-[var(--foreground)] transition-all duration-300 font-medium placeholder:text-[var(--foreground-muted)]"
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          onKeyDown={handleKeyDown} 
          onFocus={() => { if (filtered.length > 0) setIsOpen(true); }}
        />
        {query.length > 0 && !isLoading && (
            <button
              aria-label="Clear search"
              onClick={() => { setQuery(""); setIsOpen(false); onSelect("", ""); setActiveIndex(-1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-all duration-200 rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
            >
                <X className="h-4 w-4" />
            </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            id={listboxId}
            role="listbox"
            ref={listRef}
            className="absolute w-full mt-2 bg-white/95 backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl shadow-lg max-h-[320px] overflow-y-auto z-[100] p-1.5 flex flex-col gap-0.5"
          >
            {filtered.length > 0 ? (
              <>
                <li className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest ml-1">
                  Top matches
                </li>
                {filtered.map((job, idx) => {
                  const formattedCode = job.code.includes('.') ? job.code : `${job.code}.00`;
                  const isActive = idx === activeIndex;

                  return (
                    <li
                      key={`${job.code}-${idx}`}
                      role="option"
                      aria-selected={isActive}
                      className={`px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 flex justify-between items-center gap-4 ${
                        isActive 
                          ? "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]" 
                          : "hover:bg-[var(--surface-muted)] text-[var(--foreground)]"
                      }`}
                      onClick={() => handleSelect(job)}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <span className="font-semibold text-[14px] truncate">{job.title}</span>
                      <div className={`text-xs font-mono font-bold text-right min-w-[72px] px-2 py-1 rounded-md transition-colors ${
                        isActive 
                          ? "bg-white border border-[var(--border-subtle)] text-[var(--brand-primary)] shadow-sm" 
                          : "bg-[var(--surface-muted)] border border-transparent text-[var(--foreground-muted)]"
                      }`}>
                        {formattedCode}
                      </div>
                    </li>
                  );
                })}
              </>
            ) : (
              <li className="px-4 py-6 text-sm text-[var(--foreground-muted)] text-center font-medium">
                No matches found. Try <span className="text-[var(--foreground)]">"software"</span> or <span className="text-[var(--foreground)]">"analyst"</span>.
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}