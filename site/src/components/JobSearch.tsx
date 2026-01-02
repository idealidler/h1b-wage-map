"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Network } from "lucide-react";

interface Job {
  soc: string;
  title: string;
  isAlias?: boolean; // New flag to style "Child" titles differently
  parentTitle?: string; // To show "Maps to: Data Scientist"
}

// --- INTELLIGENCE MAP (Same as your Python script) ---
// This maps Parent SOC Codes to common "Real World" Job Titles
const ONET_ALIASES: Record<string, string[]> = {
  "15-1252": ["Software Developers", "Application Developers"],
  "15-1253": ["Software Quality Assurance Analysts", "QA Testers", "SDET"],
  "15-1299": ["Computer Systems Engineers", "DevOps Engineers", "Site Reliability Engineers", "SRE"],
  "15-1211": ["Computer Systems Analysts", "Product Owners (Technical)", "Systems Architects"],
  "15-1212": ["Information Security Analysts", "Cyber Security Analysts"],
  "15-1231": ["Network Support Specialists", "IT Support Specialists"],
  "15-1242": ["Database Administrators", "DBA"],
  "15-1243": ["Database Architects", "Data Warehouse Architects"],
  "15-2051": ["Business Intelligence Analysts", "Data Scientists", "Clinical Data Managers", "Data Engineers"],
  "15-2031": ["Operations Research Analysts", "Supply Chain Analysts"],
  "15-2041": ["Statisticians", "Biostatisticians"],
  "15-2011": ["Actuaries"],
  "13-1111": ["Management Analysts", "Business Analysts", "Management Consultants"],
  "13-2011": ["Accountants", "Auditors", "CPA"],
  "13-1161": ["Market Research Analysts", "Marketing Specialists"],
  "11-3021": ["Computer and Information Systems Managers", "IT Managers", "Engineering Managers", "CTO"],
  "11-2021": ["Marketing Managers", "Brand Managers"],
  "17-2071": ["Electrical Engineers"],
  "17-2141": ["Mechanical Engineers"],
  "17-2061": ["Hardware Engineers"],
};

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
      .then((originalData: Job[]) => {
        
        // --- DATA AUGMENTATION STEP ---
        // We take the official list and "inject" our O*NET aliases into it
        const expandedJobs: Job[] = [...originalData];
        
        originalData.forEach((officialJob) => {
            const aliases = ONET_ALIASES[officialJob.soc];
            if (aliases) {
                aliases.forEach(aliasTitle => {
                    // Only add if it's not exactly the same as the official title to avoid dupes
                    if (aliasTitle.toLowerCase() !== officialJob.title.toLowerCase()) {
                        expandedJobs.push({
                            soc: officialJob.soc,
                            title: aliasTitle,
                            isAlias: true,
                            parentTitle: officialJob.title // Store "Data Scientist" as parent
                        });
                    }
                });
            }
        });

        setJobs(expandedJobs);
      });

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

    const lowerQuery = query.toLowerCase();

    // Search by Title (Official OR Alias) OR Code
    const matches = jobs
      .filter((j) => 
        (j.title && j.title.toLowerCase().includes(lowerQuery)) || 
        (j.soc && j.soc.includes(lowerQuery))
      )
      // Sort logic: Exact startsWith matches first, then alias matches
      .sort((a, b) => {
         const aStarts = a.title.toLowerCase().startsWith(lowerQuery);
         const bStarts = b.title.toLowerCase().startsWith(lowerQuery);
         if (aStarts && !bStarts) return -1;
         if (!aStarts && bStarts) return 1;
         return 0;
      })
      .slice(0, 15); // Show a few more results since we have aliases now
      
    setFiltered(matches);
    
    if (matches.length > 0) setIsOpen(true);
  }, [query, jobs, initialValue]);

  const handleSelect = (job: Job) => {
    setQuery(job.title);
    
    // CRITICAL: We pass the SOC Code (e.g. 15-2051)
    // But for the "title" display in the UI, we prefer the Official Parent Title 
    // This prevents confusion if the map says "Data Scientist" but the user selected "BI Analyst"
    // (Or you can pass job.title if you want the UI to keep saying "BI Analyst")
    onSelect(job.soc, job.parentTitle || job.title);
    
    setIsOpen(false);
  };

  return (
    <div className="relative w-full z-[100]" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search job title (e.g. BI Analyst) or Code..."
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
                    onSelect("", ""); 
                }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="h-5 w-5" />
            </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 z-[100]">
          {filtered.map((job, idx) => (
            <li
              key={`${job.soc}-${idx}`}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
              onClick={() => handleSelect(job)}
            >
              <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                      <span className="font-medium text-sm flex items-center gap-2">
                          {job.title}
                          {/* Badge for Aliases */}
                          {job.isAlias && (
                              <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                  <Network className="w-2.5 h-2.5" /> Mapped
                              </span>
                          )}
                      </span>
                      
                      {/* Helper text: "Maps to Data Scientist" */}
                      {job.isAlias && job.parentTitle && (
                          <span className="text-[10px] text-gray-400 mt-0.5">
                              Uses wage data for: <strong className="text-gray-500">{job.parentTitle}</strong>
                          </span>
                      )}
                  </div>
                  
                  <div className="text-xs text-gray-400 font-mono text-right min-w-[60px]">
                    {job.soc}
                  </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}