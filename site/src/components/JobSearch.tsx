"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface Job {
  soc: string;
  title: string;
}

export default function JobSearch({ 
  onSelect, 
  initialValue 
}: { 
  onSelect: (soc: string, title: string) => void,
  initialValue?: string 
}) {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filtered, setFiltered] = useState<Job[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/job-index.json")
      .then((res) => res.json())
      .then((data) => setJobs(data));

    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialValue) {
        setQuery(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (initialValue && query === initialValue) {
        setIsOpen(false);
        return;
    }

    if (query.length < 2) {
      setFiltered([]);
      setIsOpen(false);
      return;
    }
    const matches = jobs
      .filter((j) => j.title && j.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
    setFiltered(matches);
    
    if (matches.length > 0) setIsOpen(true);
  }, [query, jobs, initialValue]);

  const handleSelect = (job: Job) => {
    setQuery(job.title);
    onSelect(job.soc, job.title);
    setIsOpen(false);
  };

  return (
    // FIX: z-[100] ensures this sits on top of everything
    <div className="relative w-full z-[100]" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search job (e.g. Software Developer)..."
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-black transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
             if (filtered.length > 0) setIsOpen(true);
          }}
        />
        {query.length > 0 && (
            <button 
                onClick={() => { 
                    setQuery(""); 
                    setIsOpen(false); 
                }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="h-5 w-5" />
            </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 z-[100]">
          {filtered.map((job) => (
            <li
              key={job.soc}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
              onClick={() => handleSelect(job)}
            >
              <div className="font-medium text-sm">{job.title}</div>
              <div className="text-xs text-gray-400 font-mono">{job.soc}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}