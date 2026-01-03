"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Building2, Briefcase, ChevronDown, CheckCircle2, Loader2, ArrowLeft, Network, TrendingUp, HelpCircle, FileText, Database, ExternalLink, ShieldCheck, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

// --- TYPES ---
interface SocOption {
  s: string; t: string; n: number; y: number[]; o?: string[];
}
interface CompanyMap {
  [company: string]: { [title: string]: SocOption[] };
}

export default function LcaSearch() {
  const router = useRouter();
  
  const [dataCache, setDataCache] = useState<CompanyMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
  
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const lastFetchedKey = useRef<string>("");

  // --- DYNAMIC FETCHING ---
  useEffect(() => {
    if (companySearch.length < 2) return;

    let key = companySearch.slice(0, 2).toUpperCase();
    if (!/^[A-Z]{2}$/.test(key)) {
        if (/^[A-Z]/.test(key)) { /* "A_" case */ }
        else { key = "00"; }
    }

    if (dataCache[key] || lastFetchedKey.current === key) return;

    setLoading(true);
    lastFetchedKey.current = key;

    fetch(`/db/${key}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("No data");
        return res.json();
      })
      .then((json) => {
        setDataCache(prev => ({ ...prev, ...json }));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

  }, [companySearch, dataCache]);

  const formatSocDisplay = (code: string) => code.replace(".00", "");

  const filteredCompanies = useMemo(() => {
    if (!companySearch || companySearch.length < 2) return [];
    return Object.keys(dataCache)
      .filter(c => c.includes(companySearch.toUpperCase()))
      .slice(0, 5);
  }, [dataCache, companySearch]);

  const sortedTitles = useMemo(() => {
    if (!selectedCompany || !dataCache[selectedCompany]) return [];
    const companyData = dataCache[selectedCompany];
    const allTitles = Object.keys(companyData);
    const matches = allTitles.filter(t => t.includes(titleSearch.toUpperCase()));
    
    return matches.sort((a, b) => {
      const totalA = companyData[a].reduce((sum, opt) => sum + opt.n, 0);
      const totalB = companyData[b].reduce((sum, opt) => sum + opt.n, 0);
      return totalB - totalA;
    }).slice(0, 5); 
  }, [selectedCompany, dataCache, titleSearch]);

  const handleSelectResult = (socCode: string, socTitle: string) => {
    const parentSoc = socCode.split('.')[0]; 
    router.push(`/?soc=${parentSoc}&title=${encodeURIComponent(socTitle)}`);
  };

  const clearCompany = () => {
    setSelectedCompany("");
    setCompanySearch("");
    setTitleSearch("");
    setExpandedJob(null);
  };

  const toggleExpand = (title: string) => {
    setExpandedJob(expandedJob === title ? null : title);
  };

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    // REMOVED min-h-[500px] to fix white space/aspect ratio issue
    <div className="space-y-6 animate-in fade-in duration-500">
        
        {!selectedCompany ? (
            <div className="space-y-8 max-w-xl mx-auto mt-4">
                
                {/* --- 1. SEARCH INPUT --- */}
                <div className="relative group z-30">
                    <input
                        type="text"
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        placeholder="Search Employer Name (e.g. GOOGLE)..."
                        autoFocus
                        className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-2xl shadow-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all text-lg font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-400"
                    />
                    <Search className="w-6 h-6 text-gray-400 absolute left-4 top-4" />
                    
                    {loading && (
                        <div className="absolute right-4 top-4">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        </div>
                    )}

                    {companySearch.length >= 2 && filteredCompanies.length > 0 && (
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
                                    <ChevronDown className="w-5 h-5 text-gray-300 group-hover:text-purple-500 -rotate-90" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- 2. DATA TRANSPARENCY CARD (Restored 3-Column Layout) --- */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                        <Database className="w-4 h-4 text-purple-600" />
                        <h3 className="text-sm font-bold text-gray-800">Where does this data come from?</h3>
                    </div>
                    
                    <div className="p-5 grid gap-6 sm:grid-cols-3 text-sm">
                        
                        {/* Column 1 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 font-bold text-gray-900">
                                <Briefcase className="w-4 h-4 text-blue-500" />
                                1. Job Title
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                This is the internal title your company wrote on <strong>Form ETA-9035</strong> (LCA) when applying for the visa.
                            </p>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 font-bold text-gray-900">
                                <FileText className="w-4 h-4 text-purple-500" />
                                2. SOC Code
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Employers <strong>must</strong> map your role to a government SOC Code to determine your Prevailing Wage.
                            </p>
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 font-bold text-gray-900">
                                <ShieldCheck className="w-4 h-4 text-green-600" />
                                3. Validation
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                We aggregate only <strong>Certified</strong> filings from the official OFLC Disclosure Data.
                            </p>
                        </div>
                    </div>

                    {/* Footer Actions (Updated with FY Years) */}
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Data: FY 2022, 2023, 2024 & 2025
                        </div>
                        
                        <a 
                            href="https://www.dol.gov/agencies/eta/foreign-labor/performance" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 hover:underline"
                        >
                            Verify at Official DOL Data Center
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>

            </div>
        ) : (
            <div className="space-y-6">
                {/* HEADER */}
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
                            placeholder={`Enter your current job title...`}
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-gray-900 shadow-sm"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    </div>

                    {!titleSearch && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium px-1 mt-2 animate-in fade-in">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Showing top 5 job titles
                        </div>
                    )}
                </div>

                {/* --- RESULTS LIST --- */}
                <div className="space-y-3 pb-8">
                    {sortedTitles.map(title => {
                        const options = dataCache[selectedCompany][title];
                        const totalFilings = options.reduce((sum, o) => sum + o.n, 0);
                        const isExpanded = expandedJob === title;

                        return (
                            <div key={title} className={`bg-white rounded-xl border transition-all overflow-hidden ${isExpanded ? "border-purple-300 shadow-md ring-1 ring-purple-100" : "border-gray-200 shadow-sm hover:border-purple-200"}`}>
                                
                                {/* 1. MAIN ROW (Job Title) */}
                                <button 
                                    onClick={() => toggleExpand(title)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isExpanded ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                                                Company Job Title
                                            </p>
                                            <h4 className="font-bold text-gray-900 text-base">{title}</h4>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                            <span className="text-xs font-bold text-gray-700">{totalFilings} filings</span>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                    </div>
                                </button>

                                {/* 2. EXPANDED CONTENT (SOC Options) */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/30 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        <p className="px-1 text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
                                            Select Official Category:
                                        </p>
                                        
                                        {options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectResult(opt.s, opt.t)}
                                                className="w-full bg-white p-3 rounded-lg border border-gray-200 hover:border-purple-400 hover:shadow-sm transition-all text-left group flex flex-col gap-2"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-slate-800 text-white font-mono font-bold text-xs px-2 py-0.5 rounded">
                                                            {formatSocDisplay(opt.s)}
                                                        </span>
                                                        <span className="text-sm font-semibold text-blue-700 group-hover:underline decoration-blue-300 underline-offset-4">
                                                            {opt.t}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Meta Info: Years + O*NET */}
                                                <div className="flex items-center flex-wrap gap-2 pl-1">
                                                    <div className="flex gap-0.5">
                                                        {opt.y.map(year => (
                                                            <span key={year} className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded border border-gray-200">
                                                                {year}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    
                                                    {opt.o && opt.o.length > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 border-l border-gray-300 pl-2 ml-1">
                                                            <Network className="w-3 h-3" />
                                                            <span className="truncate max-w-[200px]">
                                                                {opt.o[0].split(":")[1].trim()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {sortedTitles.length === 0 && titleSearch && (
                        <div className="text-center py-12 text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No titles match "{titleSearch}"</p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}