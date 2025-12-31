"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import JobSearch from "@/components/JobSearch";
import WageMap from "@/components/WageMap";
import { Info, TrendingUp, AlertTriangle, Calendar, Linkedin, Github, DollarSign, Sparkles, MapPin, X, CheckCircle2, BookOpen, TrendingDown, ShieldAlert, Users, FileWarning } from "lucide-react";

// --- COMPLIANCE MODAL ---
function ComplianceModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-300">
                <div className="bg-blue-700 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-100" /> New FY2027 Compliance Rules
                    </h2>
                    <button onClick={onClose} className="text-blue-100 hover:text-white hover:bg-blue-600/50 p-1 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <p className="text-gray-900 text-base leading-relaxed font-medium">
                        To use this map accurately, you must understand how USCIS determines your "Work Location" under the new <strong>Weighted Selection Rule</strong>.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-300">
                            <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-700" /> On-Site & Remote
                            </h3>
                            <div className="text-sm text-gray-800 space-y-1">
                                <p><strong>On-Site:</strong> Wage level is based on your <u>Office Location</u>.</p>
                                <p><strong>Remote:</strong> Wage level is based on your <u>Home Address</u>.</p>
                            </div>
                        </div>
                        
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                            <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-700" /> Hybrid Workers
                            </h3>
                            <p className="text-sm text-gray-900">
                                <strong>The "Lowest Wage" Rule:</strong> If you work in multiple locations (e.g. Home + Office), your lottery odds are based on whichever location has the <strong className="text-red-700">lower</strong> wage level.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-gray-100 pt-4">
                        <div className="flex gap-3 items-start">
                            <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-800">
                                <span className="font-bold text-gray-900">The Binding Wage Rule:</span> Your registration wage level acts as a binding minimum. If selected, your final petition <u>must</u> be filed at that same level or higher. You cannot "win" at Level 4 and file at Level 2; such petitions will be <strong className="text-red-700">automatically denied</strong>.
                            </div>
                        </div>
                         <div className="flex gap-3 items-start">
                             <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                             <div className="text-sm text-gray-800">
                                <span className="font-bold text-gray-900">Unsure of your Job Code?</span> Check your Job Description or ask HR. Or use our <a href="/find-soc" className="text-blue-700 underline hover:text-blue-900 font-semibold">AI Tool</a> to find it.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
                    <button 
                        onClick={onClose}
                        className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm hover:shadow-md"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- MAIN CONTENT ---
function WageMapContent() {
    const searchParams = useSearchParams();
    
    const [selectedSoc, setSelectedSoc] = useState<string>("15-1252"); 
    const [jobTitle, setJobTitle] = useState<string>("Software Developers");
    const [salary, setSalary] = useState<number | "">(120000); 
    const [showModal, setShowModal] = useState(false); 

    // 1. SESSION STORAGE & URL PARAMS LOGIC
    useEffect(() => {
        // Check URL first (Coming from AI tool?)
        const urlSoc = searchParams.get("soc");
        const urlTitle = searchParams.get("title");
        if (urlSoc && urlTitle) {
            setSelectedSoc(urlSoc);
            setJobTitle(urlTitle);
            // If they just came from AI tool, we assume they are "in the flow", don't show modal
        } else {
            // Check Session Storage - Have they seen the rules this session?
            const hasSeenRules = sessionStorage.getItem("hasSeenRules");
            if (!hasSeenRules) {
                setShowModal(true);
            }
        }
    }, [searchParams]);

    const handleCloseModal = () => {
        setShowModal(false);
        sessionStorage.setItem("hasSeenRules", "true"); // Mark as seen
    };

    return (
      <main className="min-h-screen bg-white flex flex-col relative font-sans text-gray-900">
        
        {showModal && <ComplianceModal onClose={handleCloseModal} />}

        <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 flex-grow">
            
            {/* HEADER */}
            <div className="text-center space-y-5 max-w-3xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                    H-1B Wage Map <span className="text-blue-700">FY 2027</span> 🇺🇸
                </h1>
                
                <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl text-sm leading-relaxed shadow-sm">
                    <p className="font-bold text-blue-900 mb-2 flex items-center justify-center gap-2 text-base">
                        <Info className="w-5 h-5" />
                        Why do I need this tool?
                    </p>
                    Starting <span className="font-bold">March 2026 (FY 2027)</span>, the H-1B lottery changes from a random draw to a <span className="font-bold text-blue-900">Wage-Level Weighted Selection</span>. 
                    Your salary offer now directly dictates your probability of selection.
                </div>
                
                {!showModal && (
                    <button 
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:text-blue-700 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm"
                    >
                        <BookOpen className="w-4 h-4" />
                        View Website Navigation Dialog Box
                    </button>
                )}
            </div>

            {/* CONTROLS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-50">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-gray-900">1. Select Job Role</label>
                        <a href="/find-soc" className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Don't know your code?
                        </a>
                    </div>
                    
                    <JobSearch 
                       
                        initialValue={jobTitle} 
                        onSelect={(soc, title) => {
                            setSelectedSoc(soc);
                            setJobTitle(title); 
                        }} 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-900">2. Enter Base Salary ($)</label>
                    <input 
                        type="number" 
                        value={salary}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSalary(val === "" ? "" : Number(val));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium transition-all"
                        placeholder="Base Pay Only (No Stocks)"
                    />
                    <p className="text-[11px] text-gray-500 font-medium text-right">Do not include RSUs or Bonus.</p>
                </div>
            </div>

            {/* MAP */}
            <WageMap socCode={selectedSoc} jobTitle={jobTitle} userSalary={salary === "" ? 0 : salary} />
            
            {/* NEW: BENTO GRID LAYOUT FOR FACTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                
                {/* 1. SELECTION ODDS (Takes up 2/3 space) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-700" />
                        <h3 className="font-bold text-gray-900">Impact on Lottery Odds</h3>
                    </div>
                    
                    <div className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                            <span>Wage Level</span>
                            <span>Projected Change vs Random</span>
                        </div>

                        {/* LEVEL 4 */}
                        <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-900 text-sm">Level 4 (Senior)</span>
                                    <span className="bg-green-200 text-green-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Safe</span>
                                </div>
                                <p className="text-xs text-green-800 mt-0.5">Highest priority selection.</p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-green-700 text-lg">+107%</span>
                                <span className="text-[10px] text-green-600 font-medium">Boost</span>
                            </div>
                        </div>

                        {/* LEVEL 3 */}
                        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-900 text-sm">Level 3 (Mid-Senior)</span>
                                    <span className="bg-blue-200 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Likely</span>
                                </div>
                                <p className="text-xs text-blue-800 mt-0.5">Strong advantage over random.</p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-blue-700 text-lg">+55%</span>
                                <span className="text-[10px] text-blue-600 font-medium">Boost</span>
                            </div>
                        </div>

                        {/* LEVEL 2 */}
                        <div className="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-amber-900 text-sm">Level 2 (Associate)</span>
                                    <span className="bg-amber-200 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Neutral</span>
                                </div>
                                <p className="text-xs text-amber-800 mt-0.5">Slight improvement over random.</p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-amber-700 text-lg">+3%</span>
                                <span className="text-[10px] text-amber-600 font-medium">Boost</span>
                            </div>
                        </div>

                        {/* LEVEL 1 */}
                        <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg border border-red-100 opacity-90">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-900 text-sm">Level 1 (Entry)</span>
                                    <span className="bg-red-200 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Hard</span>
                                </div>
                                <p className="text-xs text-red-800 mt-0.5">Significantly harder odds.</p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-red-700 text-lg">-48%</span>
                                <span className="text-[10px] text-red-600 font-medium">Drop</span>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 pb-4 text-xs text-gray-400">
                        * Based on statistical projections in DHS Docket No. USCIS-2025-0040.
                    </div>
                </div>

                {/* 2. CRITICAL COMPLIANCE (Takes up 1/3 space) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                     <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-orange-600" />
                        <h3 className="font-bold text-gray-900">Critical Alerts</h3>
                    </div>
                    <div className="p-5 flex-grow space-y-4 text-sm">
                        
                        {/* ITEM 1: BASE SALARY */}
                        <div className="flex gap-3">
                            <div className="bg-purple-100 p-2 rounded-lg h-fit">
                                <DollarSign className="w-5 h-5 text-purple-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Base Salary ONLY</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    <strong>Do NOT include Stocks (RSUs)</strong> or Sign-on Bonuses. Only guaranteed base pay counts.
                                </p>
                            </div>
                        </div>

                        {/* ITEM 2: MULTIPLE SPONSORS (New & Critical) */}
                        <div className="flex gap-3">
                            <div className="bg-red-100 p-2 rounded-lg h-fit">
                                <Users className="w-5 h-5 text-red-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Multiple Sponsors Risk</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    If 2+ companies apply for you, USCIS assigns you the <strong>lowest</strong> wage level among all offers. One low offer poisons your odds.
                                </p>
                            </div>
                        </div>

                        {/* ITEM 3: SALARY RANGES (New) */}
                        <div className="flex gap-3">
                            <div className="bg-amber-100 p-2 rounded-lg h-fit">
                                <FileWarning className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Salary Ranges</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    If your offer states a range (e.g. $100k-$120k), the <strong>minimum ($100k)</strong> is used for lottery weighting.
                                </p>
                            </div>
                        </div>

                        {/* ITEM 4: REMOTE WORK */}
                        <div className="flex gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg h-fit">
                                <MapPin className="w-5 h-5 text-blue-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Remote = Home</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    Working remotely? Your lottery odds are tied to your <strong>home zip code</strong> wage data, not the HQ.
                                </p>
                            </div>
                        </div>

                        {/* ITEM 5: MASTER'S DEGREE REALITY CHECK */}
                        <div className="flex gap-3">
                            <div className="bg-pink-100 p-2 rounded-lg h-fit">
                                <BookOpen className="w-5 h-5 text-pink-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Wage {'>'} Degree</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    The Master's Cap is now weighted too. A <strong>Level 1 Master's</strong> candidate has much lower odds than a <strong>Level 3 Bachelor's</strong> candidate. Your degree is no longer a safety shield.
                                </p>
                            </div>
                        </div>
                        
                        {/* ITEM 6: BELOW LEVEL 1 RULE */}
                        <div className="flex gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg h-fit">
                                <TrendingDown className="w-5 h-5 text-slate-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Below Level 1 = Ineligible</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    If your salary falls below the Level 1 wage, you are <strong>not eligible</strong> for the H-1B lottery. There is no "Level 0" entry. You must strictly meet at least the Level 1 prevailing wage to register.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* --- NEW ADDITION: BI ANALYST & DATA SCIENTIST NOTE --- */}
            <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex gap-4">
                    <div className="bg-white p-2 rounded-full shadow-sm h-fit">
                        <Info className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">
                            Note for Business Intelligence Analysts
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Business Intelligence Analysts and Data Scientists currently share the same classification code 
                            <span className="mx-1.5 font-mono font-bold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">15-2051</span>.
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                            If you are searching for <span className="font-medium text-gray-900">Business Intelligence Analyst</span> salary data, 
                            please search for <span className="font-bold text-blue-700">Data Scientist</span> to see the correct H1B filing records.
                        </p>
                    </div>
                </div>
            </div>
            {/* -------------------------------------------------------- */}

        </div>

        {/* FOOTER */}
        <footer className="bg-white border-t border-gray-200 mt-12 py-8">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                    <p className="text-sm text-gray-600 font-medium">
                        Data Source: DOL FLC Data Center (July 2025) & DHS Docket No. USCIS-2025-0040.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Not legal advice. For informational purposes only. Please check the OFLC Wage Search tool for confirming the data.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                    {/* ATTRIBUTION LINK */}
                    <a 
                        href="https://wagemap.vercel.app/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Inspired by WageMap
                    </a>

                    <div className="flex items-center gap-6">
                        <span className="text-sm font-bold text-gray-700">Developed by Akshay Jain</span>
                        <a href="https://www.linkedin.com/in/akshayjain128/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0077b5] transition-colors">
                            <Linkedin className="w-5 h-5" />
                            <span className="sr-only">LinkedIn</span>
                        </a>
                        <a href="https://github.com/idealidler" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors">
                            <Github className="w-5 h-5" />
                            <span className="sr-only">GitHub</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
      </main>
    );
}

// Wrap in Suspense for Next.js Safety
export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WageMapContent />
        </Suspense>
    );
}