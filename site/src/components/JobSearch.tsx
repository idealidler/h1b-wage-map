"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface Job {
  soc: string;
  title: string;
}

// UPDATE: onSelect now accepts the Title as a second argument
export default function JobSearch({ onSelect }: { onSelect: (soc: string, title: string) => void }) {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filtered, setFiltered] = useState<Job[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/job-index.json")
      .then((res) => res.json())
      .then((data) => setJobs(data));
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
    <div className="relative w-full z-50">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search job (e.g. Software Developer)..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-black"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.map((job) => (
            <li
              key={job.soc}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700 border-b border-gray-100 last:border-0"
              onClick={() => {
                setQuery(job.title || "Unknown Job");
                onSelect(job.soc, job.title); // Pass BOTH code and title
                setIsOpen(false);
              }}
            >
              <div className="font-medium">{job.title}</div>
              <div className="text-xs text-gray-400">{job.soc}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}