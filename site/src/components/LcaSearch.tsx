"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Building2, Briefcase, ChevronRight, AlertCircle, CheckCircle2, Loader2, Calendar, X, TrendingUp, HelpCircle, ArrowLeft, Network } from "lucide-react";
import { useRouter } from "next/navigation";

interface SocOption {
  s: string; // SOC Code
  t: string; // Title
  n: number; // Count
  y: number[]; // Years
  o?: string[]; // O*NET Codes (Optional)
}

interface CompanyMap {
  [company: string]: {
    [title: string]: SocOption[]; 
  };
}

export default function LcaSearch() {
  const router = useRouter();
  
  const [data, setData] = useState<CompanyMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
  
  useEffect(() => {
    fetch("/company_soc_map.json")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load database.");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Database missing.");
        setLoading(false);
      });
  }, []);

  // Visual helper: just removes .00 for display
  const formatSocDisplay = (code: string) => code.replace(".00", "");

  const filteredCompanies = useMemo(() => {
    if (!data || !companySearch) return [];
    return Object.keys(data)
      .filter(c => c.includes(companySearch.toUpperCase()))
      .slice(0, 5);
  }, [data, companySearch]);

  const sortedTitles = useMemo(() => {
    if (!selectedCompany || !data) return [];
    const companyData = data[selectedCompany];
    const allTitles = Object.keys(companyData);
    const matches = allTitles.filter(t => t.includes(titleSearch.toUpperCase()));
    const sorted = matches.sort((a, b) => {
      const totalA = companyData[a].reduce((sum, opt) => sum + opt.n, 0);
      const totalB = companyData[b].reduce((sum, opt) => sum + opt.n, 0);
      return totalB - totalA;
    });

    return titleSearch ? sorted.slice(0, 20) : sorted.slice(0, 5);
  }, [selectedCompany, data, titleSearch]);

  const handleSelectResult = (socCode: string, socTitle: string) => {
    // --- THE FIX: STRICT PARENT MAPPING ---
    // If code is "15-2051.01", we split by "." and take the first part "15-2051"
    // This ensures it matches your Wage Map JSON files (which are all Parent SOCs)
    const parentSoc = socCode.split('.')[0]; 
    
    router.push(`/?soc=${parentSoc}&title=${encodeURIComponent(socTitle)}`);
  };

  const clearCompany = () => {
    setSelectedCompany("");
    setCompanySearch("");
    setTitleSearch("");
  };

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-medium">Loading Records...</p>
    </div>
  );

  if (error) return (
    <div className="h-48 flex flex-col items-center justify-center text-red-500 gap-2 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="w-6 h-6" />
        <p className="text-sm font-bold">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 min-h-[500px]">
        
        {!selectedCompany ? (
            <div className="space-y-6 max-w-xl mx-auto mt-6">
                {/* HOW TO USE NOTE */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-900">
                    <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="space-y-1">
                        <p className="font-bold">How to use Company Data:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-blue-800">
                            <li>Search for your employer (e.g. "Google").</li>
                            <li>See the exact job titles they filed in LCA.</li>
                            <li>Find the <strong>SOC Code</strong> used for your role.</li>
                        </ul>
                    </div>
                </div>

                <div className="relative group">
                    <input
                        type="text"
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        placeholder="Search Employer Name..."
                        autoFocus
                        className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-2xl shadow-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all text-lg font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-400"
                    />
                    <Search className="w-6 h-6 text-gray-400 absolute left-4 top-4" />
                    
                    {companySearch && filteredCompanies.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100">
                            {filteredCompanies.map(comp => (
                                <button
                                    key={comp}
                                    onClick={() => {
                                        setCompanySearch(comp);
                                        setSelectedCompany(comp);
                                    }}
                                    className="w-full text-left px-5 py-4 hover:bg-purple-50 text-base font-bold text-gray-700 flex items-center justify-between group transition-colors"
                                >
                                    {comp}
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                
                {/* COMPANY HEADER */}
                <div className="sticky top-0 z-20 bg-white pb-4 border-b border-gray-100">
                    <button 
                        onClick={clearCompany}
                        className="group flex items-center justify-between w-full bg-purple-50 hover:bg-purple-100 p-4 rounded-xl border border-purple-100 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm">
                                <Building2 className="w-5 h-5 text-purple-700" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-0.5">Selected Employer</p>
                                <h3 className="text-lg font-bold text-gray-900 leading-none">{selectedCompany}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-white px-3 py-1.5 rounded-full shadow-sm group-hover:text-purple-800">
                            <ArrowLeft className="w-3 h-3" />
                            Change
                        </div>
                    </button>
                    
                    <div className="mt-4 relative">
                        <input
                            type="text"
                            value={titleSearch}
                            onChange={(e) => setTitleSearch(e.target.value)}
                            placeholder={`Search job titles at ${selectedCompany}...`}
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-gray-900 shadow-sm"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    </div>

                    {!titleSearch && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium px-1 mt-2 animate-in fade-in">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Showing top 5 titles by volume
                        </div>
                    )}
                </div>

                {/* RESULTS LIST */}
                <div className="space-y-3 pb-8">
                    {sortedTitles.map(title => {
                        const options = data![selectedCompany][title];
                        
                        return (
                            <div key={title} className="w-full bg-white rounded-xl border border-gray-200 shadow-sm hover:border-purple-300 transition-all overflow-hidden group/card">
                                <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100">
                                    <h4 className="font-bold text-gray-900 text-sm md:text-base">{title}</h4>
                                </div>
                                
                                <div className="divide-y divide-gray-100">
                                    {options.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectResult(opt.s, opt.t)}
                                            className="w-full flex flex-col p-4 hover:bg-purple-50 transition-colors text-left gap-3"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-white border border-gray-200 text-gray-700 text-xs font-mono font-bold px-2 py-0.5 rounded shadow-sm group-hover:border-purple-200 group-hover:text-purple-700">
                                                            {formatSocDisplay(opt.s)}
                                                        </span>
                                                        <span className="text-sm text-gray-600 font-medium">
                                                            {opt.t}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Years Badges */}
                                                    <div className="flex items-center flex-wrap gap-1">
                                                        {opt.y.map(year => (
                                                            <span key={year} className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                                                year >= 2024 
                                                                    ? "bg-green-50 text-green-700 border-green-100" 
                                                                    : "bg-gray-50 text-gray-500 border-gray-100"
                                                            }`}>
                                                                {year}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 self-start md:self-center">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span className="font-bold">{opt.n}</span> filings
                                                    <ChevronRight className="w-4 h-4 ml-1 text-gray-300" />
                                                </div>
                                            </div>

                                            {/* O*NET HINT */}
                                            {opt.o && opt.o.length > 0 && (
                                                <div className="mt-1 pl-1 border-l-2 border-blue-200 ml-1">
                                                    <div className="flex items-start gap-1.5 pl-2 text-[11px] text-gray-500">
                                                        <Network className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-medium text-gray-400">Commonly used for O*NET Codes:</span>
                                                            {opt.o.map((onet, i) => (
                                                                <span key={i} className="text-gray-600 block">
                                                                    • {onet.split(":")[1].trim()} <span className="text-gray-400 font-mono">({onet.split(":")[0]})</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    
                    {sortedTitles.length === 0 && titleSearch && (
                        <div className="text-center py-12 text-gray-400">
                            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No job titles match "{titleSearch}"</p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}