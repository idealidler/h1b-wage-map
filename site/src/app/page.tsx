"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import JobSearch from "@/components/JobSearch";
import WageMap from "@/components/WageMap";
import PromoBanner from "@/components/PromoBanner";
import { 
    Info, TrendingUp, AlertTriangle, Calendar, Linkedin, Github, 
    DollarSign, Sparkles, MapPin, X, CheckCircle2, BookOpen, 
    TrendingDown, ShieldAlert, Users, FileWarning, ExternalLink, 
    Ticket, Table, Share2, Link as LinkIcon, Check, Copy, MessageSquareHeart, Mail
} from "lucide-react";

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

// --- NEW SHARE COMPONENT (Soft & Modern) ---
function SocialShare() {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'H-1B Wage Map 2027',
                    text: 'Check your H-1B lottery odds under the new FY2027 Weighted Selection Rule!',
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="flex items-center justify-center gap-3 mt-4 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200">
            {/* 1. Main Share Button (Soft Blue Gradient) */}
            <button
                onClick={handleShare}
                className="group relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-b from-blue-50 to-blue-100/50 text-blue-700 border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:from-blue-100 hover:to-blue-200 transition-all active:scale-95"
            >
                <div className="absolute inset-0 rounded-full border border-blue-400 opacity-0 group-hover:animate-ping h-full w-full"></div>
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Share with Friends</span>
            </button>

            {/* 2. Copy Link Button (Soft Gray Pill) */}
            <button
                onClick={handleCopy}
                className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-sm transition-all duration-200 active:scale-95
                    ${copied 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }
                `}
            >
                {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                <span className="text-sm font-medium">{copied ? "Copied!" : "Copy Link"}</span>
            </button>
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

    // SESSION STORAGE & URL PARAMS LOGIC
    useEffect(() => {
        const urlSoc = searchParams.get("soc");
        const urlTitle = searchParams.get("title");
        if (urlSoc && urlTitle) {
            setSelectedSoc(urlSoc);
            setJobTitle(urlTitle);
        } else {
            const hasSeenRules = sessionStorage.getItem("hasSeenRules");
            if (!hasSeenRules) {
                setShowModal(true);
            }
        }
    }, [searchParams]);

    const handleCloseModal = () => {
        setShowModal(false);
        sessionStorage.setItem("hasSeenRules", "true");
    };

    return (
      <main className="min-h-screen bg-white flex flex-col relative font-sans text-gray-900">
        
        <PromoBanner />

        {showModal && <ComplianceModal onClose={handleCloseModal} />}

        <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 flex-grow mt-8">
            
            {/* HEADER */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
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
                
                <div className="flex flex-col items-center gap-4">
                    {!showModal && (
                        <button 
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:text-blue-700 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm"
                        >
                            <BookOpen className="w-4 h-4" />
                            View Compliance Rules
                        </button>
                    )}
                    
                    {/* NEW: Modern Share Section */}
                    <SocialShare />
                </div>
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
            
            {/* BENTO GRID LAYOUT FOR FACTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                
                {/* 1. SELECTION ODDS */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-700" />
                        <h3 className="font-bold text-gray-900">Lottery Probabilities (FY2027)</h3>
                    </div>
                    
                    <div className="p-0 flex flex-col flex-grow">
                        {/* Header Grid */}
                        <div className="grid grid-cols-12 px-5 py-3 bg-gray-50/50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            <div className="col-span-4">Wage Level</div>
                            <div className="col-span-4 text-center">Entries ("Tickets")</div>
                            <div className="col-span-4 text-right">Selection Chance</div>
                        </div>

                        {/* LEVEL 4 */}
                        <div className="grid grid-cols-12 px-5 py-5 border-b border-gray-50 hover:bg-green-50/50 transition-colors items-center group">
                            <div className="col-span-4">
                                <span className="block font-bold text-gray-900 text-base group-hover:text-green-800">Level 4</span>
                                <span className="text-xs text-gray-500">Senior / Expert</span>
                            </div>
                            <div className="col-span-4 text-center">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 text-green-700 border border-green-200">
                                    <Ticket className="w-4 h-4" />
                                    <span className="font-bold text-base">4x</span>
                                </div>
                            </div>
                            <div className="col-span-4 text-right">
                                <span className="block font-bold text-green-700 text-xl">~61%</span>
                                <span className="text-sm text-green-600 font-medium">+107% Boost</span>
                            </div>
                        </div>

                        {/* LEVEL 3 */}
                        <div className="grid grid-cols-12 px-5 py-5 border-b border-gray-50 hover:bg-blue-50/50 transition-colors items-center group">
                            <div className="col-span-4">
                                <span className="block font-bold text-gray-900 text-base group-hover:text-blue-800">Level 3</span>
                                <span className="text-xs text-gray-500">Mid-Senior</span>
                            </div>
                            <div className="col-span-4 text-center">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                    <Ticket className="w-4 h-4" />
                                    <span className="font-bold text-base">3x</span>
                                </div>
                            </div>
                            <div className="col-span-4 text-right">
                                <span className="block font-bold text-blue-700 text-xl">~46%</span>
                                <span className="text-sm text-blue-600 font-medium">+55% Boost</span>
                            </div>
                        </div>

                        {/* LEVEL 2 */}
                        <div className="grid grid-cols-12 px-5 py-5 border-b border-gray-50 hover:bg-amber-50/50 transition-colors items-center group">
                            <div className="col-span-4">
                                <span className="block font-bold text-gray-900 text-base group-hover:text-amber-800">Level 2</span>
                                <span className="text-xs text-gray-500">Associate</span>
                            </div>
                            <div className="col-span-4 text-center">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                    <Ticket className="w-4 h-4" />
                                    <span className="font-bold text-base">2x</span>
                                </div>
                            </div>
                            <div className="col-span-4 text-right">
                                <span className="block font-bold text-amber-700 text-xl">~30%</span>
                                <span className="text-sm text-amber-600 font-medium">+3% Boost</span>
                            </div>
                        </div>

                         {/* LEVEL 1 */}
                         <div className="grid grid-cols-12 px-5 py-5 hover:bg-red-50/50 transition-colors items-center group">
                            <div className="col-span-4">
                                <span className="block font-bold text-gray-900 text-base group-hover:text-red-800">Level 1</span>
                                <span className="text-xs text-gray-500">Entry Level</span>
                            </div>
                            <div className="col-span-4 text-center">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                                    <Ticket className="w-4 h-4" />
                                    <span className="font-bold text-base">1x</span>
                                </div>
                            </div>
                            <div className="col-span-4 text-right">
                                <span className="block font-bold text-red-700 text-xl">~15%</span>
                                <span className="text-sm text-red-600 font-medium">-48% Drop</span>
                            </div>
                        </div>
                    </div>

                    {/* SOURCE LINK FOOTER */}
                    <div className="bg-gray-50 p-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <a 
                            href="https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900 group-hover:text-blue-700 flex items-center gap-1.5">
                                    <FileWarning className="w-3.5 h-3.5" />
                                    Read Final Rule
                                </span>
                                <span className="text-[10px] text-gray-500 mt-0.5">
                                    Docket No. USCIS-2025-0040
                                </span>
                            </div>
                             <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                        </a>

                        <a 
                            href="https://img.federalregister.gov/ER29DE25.021/ER29DE25.021_original_size.png"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900 group-hover:text-blue-700 flex items-center gap-1.5">
                                    <Table className="w-3.5 h-3.5" />
                                    View Probabilities Table
                                </span>
                                <span className="text-[10px] text-gray-500 mt-0.5">
                                    Source: Federal Register (Table 13)
                                </span>
                            </div>
                             <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                        </a>
                    </div>
                </div>

                {/* 2. CRITICAL COMPLIANCE */}
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

                        {/* ITEM 2: MULTIPLE SPONSORS */}
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

                        {/* ITEM 3: BAIT & SWITCH */}
                        <div className="flex gap-3">
                            <div className="bg-white p-1.5 rounded-md h-fit shadow-sm">
                                <FileWarning className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Prohibited: "Bait & Switch"</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    Moving to a low-cost area <i>solely</i> for registration and moving back to a high-cost area after selection is flagged as fraud. <strong>Petitions can be revoked.</strong>
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

                        {/* ITEM 5: MASTER'S DEGREE */}
                        <div className="flex gap-3">
                            <div className="bg-pink-100 p-2 rounded-lg h-fit">
                                <BookOpen className="w-5 h-5 text-pink-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Master's Cap ≠ Safety Net</h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    The 20,000 Master's quota still exists, giving you a second lottery entry. However, this second drawing is now <strong>weighted by wage</strong>. A low-salary Master's degree effectively loses to a high-salary Bachelor's degree.
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

        </div>
                {/* 6. FEEDBACK & CONTACT (New Section) */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mt-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm text-blue-600 hidden sm:block">
                     <MessageSquareHeart className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 text-lg">Did this tool help you?</h3>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
                        I built this to help navigate the new H-1B rules. If you found it useful or have any feedback, please reach out! I'd love to hear your thoughts.
                    </p>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-5 sm:ml-[4.5rem]">
                <a 
                    href="https://www.linkedin.com/in/akshayjain128/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:text-[#0077b5] hover:border-[#0077b5] transition-all shadow-sm w-full sm:w-auto justify-center"
                >
                    <Linkedin className="w-4 h-4" />
                    Connect on LinkedIn
                </a>
                <a 
                    href="mailto:akshayjain128@gmail.com"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:text-red-600 hover:border-red-200 transition-all shadow-sm w-full sm:w-auto justify-center"
                >
                    <Mail className="w-4 h-4" />
                    akshayjain128@gmail.com
                </a>
            </div>
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

export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WageMapContent />
        </Suspense>
    );
}