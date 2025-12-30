"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface Job {
  soc: string;
  title: string;
}

export default function JobSearch({ onSelect }: { onSelect: (soc: string, title: string) => void }) {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filtered, setFiltered] = useState<Job[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Ref to detect clicks outside the component
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/job-index.json")
      .then((res) => res.json())
      .then((data) => setJobs(data));

    // Event listener to close dropdown if clicked outside
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setFiltered([]);
      setIsOpen(false); // Close if query is empty
      return;
    }
    const matches = jobs
      .filter((j) => j.title && j.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
    setFiltered(matches);
    // Only open if we have matches and the user is typing
    if (matches.length > 0) setIsOpen(true);
  }, [query, jobs]);

  const handleSelect = (job: Job) => {
    setQuery(job.title);
    onSelect(job.soc, job.title);
    setIsOpen(false); // Force close immediately
  };

  return (
    <div className="relative w-full z-50" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search job (e.g. Software Developer)..."
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-black"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
             // Only open if we already have results
             if (filtered.length > 0) setIsOpen(true);
          }}
        />
        {/* Clear Button */}
        {query.length > 0 && (
            <button 
                onClick={() => { setQuery(""); setIsOpen(false); }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
                <X className="h-5 w-5" />
            </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
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