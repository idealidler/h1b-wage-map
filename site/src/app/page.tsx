"use client";
import { useState } from "react";
import JobSearch from "@/components/JobSearch";
import WageMap from "@/components/WageMap";
import { Info, TrendingUp, AlertTriangle, Calendar } from "lucide-react";

export default function Home() {
  const [selectedSoc, setSelectedSoc] = useState<string>("15-1252"); 
  // NEW: Store the title (Default to Software Dev)
  const [jobTitle, setJobTitle] = useState<string>("Software Developers");
  
  const [salary, setSalary] = useState<number | "">(120000); 

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8">
        <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            H-1B Wage Map 🇺🇸
            </h1>
            <p className="text-gray-500 text-base md:text-lg">
            See your lottery odds under the new <span className="font-semibold text-blue-600">2026 Weighted Selection Rule</span>.
            </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Job Role</label>
                <JobSearch onSelect={(soc, title) => {
                    setSelectedSoc(soc);
                    setJobTitle(title); // Update title when user picks a job
                }} />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Your Annual Offer ($)</label>
                <input 
                    type="number" 
                    value={salary}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSalary(val === "" ? "" : Number(val));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-black transition-all"
                    placeholder="e.g. 120000"
                />
            </div>
        </div>

        {/* Pass Title to Map */}
        <WageMap socCode={selectedSoc} jobTitle={jobTitle} userSalary={salary === "" ? 0 : salary} />
        
        {/* FACTS SECTION (Same as before) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
             {/* ... (Keep your facts cards here) ... */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Key Takeaways from the Rule
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex gap-3">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Effective Date:</strong> The rule takes full effect on <span className="text-gray-900 font-medium">February 27, 2026</span> (FY 2027 Cap Season).</span>
                    </li>
                    <li className="flex gap-3">
                        <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span><strong>Level 4 Boost:</strong> Senior roles see a <span className="text-green-600 font-bold">+107% increase</span> in selection probability compared to the old random lottery.</span>
                    </li>
                    <li className="flex gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Entry Level Risk:</strong> Level 1 (Entry) roles face a <span className="text-red-600 font-bold">-48% drop</span> in selection odds.</span>
                    </li>
                </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Critical Compliance Facts
                </h3>
                 <ul className="space-y-3 text-sm text-gray-600">
                    <li className="border-l-2 border-orange-200 pl-3">
                        <strong>The "Lowest Wage" Rule:</strong> If you work in multiple locations (e.g., Remote + HQ), your lottery odds are determined by the location with the <span className="text-orange-600 font-semibold">lowest wage level</span>.
                    </li>
                    <li className="border-l-2 border-blue-200 pl-3">
                        <strong>No "Pay to Play":</strong> You cannot simply offer a higher salary to get a Level 4 visa. The job duties must match the wage level.
                    </li>
                </ul>
            </div>
        </div>

        <div className="text-center text-gray-400 text-xs mt-8 pb-8">
            Data Source: DOL FLC Data Center (July 2025) & DHS Final Rule 2025-23853.
        </div>
      </div>
    </main>
  );
}