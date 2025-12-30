"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import JobSearch from "@/components/JobSearch";
import WageMap from "@/components/WageMap";
import { Info, TrendingUp, AlertTriangle, Calendar, Linkedin, Github, DollarSign, Sparkles, MapPin } from "lucide-react";

function WageMapContent() {
    const searchParams = useSearchParams();
    
    // Default values
    const [selectedSoc, setSelectedSoc] = useState<string>("15-1252"); 
    const [jobTitle, setJobTitle] = useState<string>("Software Developers");
    const [salary, setSalary] = useState<number | "">(120000); 

    // CHECK URL PARAMS ON LOAD (From the AI Page)
    useEffect(() => {
        const urlSoc = searchParams.get("soc");
        const urlTitle = searchParams.get("title");
        if (urlSoc && urlTitle) {
            setSelectedSoc(urlSoc);
            setJobTitle(urlTitle);
        }
    }, [searchParams]);

    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 flex-grow">
            
            {/* HEADER & CONTEXT */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                    H-1B Wage Map <span className="text-blue-600">2027</span> 🇺🇸
                </h1>
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-gray-700 leading-relaxed shadow-sm">
                    <p className="font-semibold text-blue-800 mb-1 flex items-center justify-center gap-2">
                        <Info className="w-4 h-4" />
                        Why do I need this tool?
                    </p>
                    Starting <span className="font-bold">March 2026 (FY 2027)</span>, the H-1B lottery changes from a random draw to a <span className="font-bold">Wage-Level Weighted Selection</span>. 
                    Your salary offer now directly dictates your probability of selection. This tool maps official DOL wage data to help you identify high-probability counties.
                </div>
            </div>

            {/* CONTROLS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-700">1. Select Job Role</label>
                        {/* Link to the AI Page */}
                        <a href="/find-soc" className="text-xs text-purple-600 font-medium hover:underline flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Don't know your code?
                        </a>
                    </div>
                    
                    <JobSearch 
                        key={selectedSoc} // Force re-render if URL changes
                        initialValue={jobTitle} // Pass the title to fill the box
                        onSelect={(soc, title) => {
                            setSelectedSoc(soc);
                            setJobTitle(title); 
                        }} 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">2. Enter Base Salary ($)</label>
                    <input 
                        type="number" 
                        value={salary}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSalary(val === "" ? "" : Number(val));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-black transition-all"
                        placeholder="Base Pay Only (No Stocks)"
                    />
                    <p className="text-[10px] text-gray-400 text-right">Do not include RSUs or Bonus.</p>
                </div>
            </div>

            {/* MAP */}
            <WageMap socCode={selectedSoc} jobTitle={jobTitle} userSalary={salary === "" ? 0 : salary} />
            
            {/* FACTS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* CARD 1: THE RULE CHANGE */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Impact on Selection Odds
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex gap-3">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Effective Date:</strong> The rule takes full effect on <span className="text-gray-900 font-medium">February 27, 2026</span> (FY 2027 Cap Season).</span>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-4 h-4 text-green-500 font-bold flex-shrink-0 mt-0.5">IV</div>
                            <span><strong>Level 4 (Senior):</strong> Selection probability increases by <span className="text-green-600 font-bold">+107%</span> vs random lottery.</span>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-4 h-4 text-red-400 font-bold flex-shrink-0 mt-0.5">I</div>
                            <span><strong>Level 1 (Entry):</strong> Selection probability drops by <span className="text-red-600 font-bold">-48%</span>.</span>
                        </li>
                    </ul>
                </div>

                {/* CARD 2: COMPLIANCE & SALARY DEFINITION */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                     <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Critical Facts & Compliance
                    </h3>
                     <ul className="space-y-3 text-sm text-gray-600">
                        <li className="border-l-2 border-purple-400 pl-3 bg-purple-50/50 py-1 rounded-r">
                            <strong>Base Salary ONLY:</strong> For H-1B Prevailing Wage, you must use your <em>Guaranteed Base Pay</em>. <br/>
                            <span className="text-purple-700 font-medium text-xs block mt-1">
                                <DollarSign className="w-3 h-3 inline mr-1" />
                                Do NOT include RSUs (Stocks), Sign-on Bonuses, or Performance Bonuses. These do not count toward the wage level (20 CFR § 655.731).
                            </span>
                        </li>
                        
                        {/* NEW: MULTIPLE LOCATIONS RULE */}
                        <li className="border-l-2 border-red-400 pl-3 bg-red-50/50 py-1 rounded-r">
                            <strong>Multiple Locations / Hybrid Rule:</strong>
                            <br/>
                            If the beneficiary will work in multiple locations (e.g. Hybrid, Roving), the lottery selection is based on the <span className="text-red-700 font-bold">lowest corresponding wage level</span> among all intended worksites.
                            <span className="text-gray-400 font-mono text-[10px] block mt-1">Source: DHS Docket No. USCIS-2025-0040</span>
                        </li>

                        <li className="border-l-2 border-blue-200 pl-3">
                            <strong>No "Pay to Play":</strong> You cannot simply raise a salary to match Level 4. The job duties (experience/education) must actually match the Senior Level description.
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <footer className="bg-white border-t border-gray-200 mt-12 py-8">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                    <p className="text-sm text-gray-500">
                        Data Source: DOL FLC Data Center (July 2025) & DHS Docket No. USCIS-2025-0040.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Not legal advice. For informational purposes only.
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <span className="text-sm font-medium text-gray-600">Developed by Akshay Jain</span>
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