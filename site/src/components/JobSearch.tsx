"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface Job {
  soc: string;
  title: string;
}

export default function JobSearch({ onSelect }: { onSelect: (soc: string) => void }) {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filtered, setFiltered] = useState<Job[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Ref to handle clicking outside
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/job-index.json")
      .then((res) => res.json())
      .then((data) => setJobs(data));
      
    // Close dropdown if clicking outside
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
      return;
    }
    const matches = jobs
      .filter((j) => j.title && j.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
    setFiltered(matches);
    setIsOpen(true);
  }, [query, jobs]);

  return (
    <div ref={wrapperRef} className="relative w-full z-50">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search job (e.g. Manager)..."
          className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 font-medium transition-all"
          value={query}
          onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {query && (
            <button 
                onClick={() => { setQuery(""); setIsOpen(false); }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
                <X className="w-4 h-4" />
            </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute w-full bg-white mt-2 border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1">
          {filtered.map((job) => (
            <li
              key={job.soc}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-700 border-b border-gray-50 last:border-0 transition-colors flex flex-col"
              onClick={() => {
                setQuery(job.title); // Update input with full name
                onSelect(job.soc);   // Trigger parent update
                setIsOpen(false);    // <--- THIS FIXES THE ISSUE
              }}
            >
              <span className="text-sm font-semibold text-gray-800">{job.title}</span>
              <span className="text-xs text-gray-400">Code: {job.soc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}