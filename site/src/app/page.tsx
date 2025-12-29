"use client";
import { useState } from "react";
import JobSearch from "@/components/JobSearch";
import WageMap from "@/components/WageMap";
import { Info, Map as MapIcon, ShieldCheck } from "lucide-react";

export default function Home() {
  const [selectedSoc, setSelectedSoc] = useState<string>("15-1252"); 
  const [salary, setSalary] = useState<number | "">(120000); 

  return (
    <main className="relative w-full h-screen bg-gray-100 overflow-hidden flex flex-col md:flex-row">
      
      {/* 1. LEFT SIDEBAR (Controls) */}
      <div className="w-full md:w-[400px] h-auto md:h-full bg-white z-20 shadow-2xl flex flex-col border-r border-gray-200 overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white">
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <MapIcon className="w-6 h-6 text-blue-600" />
                H-1B Wage Map
            </h1>
            <p className="text-sm text-gray-500 mt-1">
                Strategic Intelligence for the FY2027 Weighted Selection.
            </p>
        </div>

        {/* Inputs */}
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Role</label>
                <JobSearch onSelect={setSelectedSoc} />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Annual Offer</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                    <input 
                        type="number" 
                        value={salary}
                        onChange={(e) => setSalary(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full pl-7 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 font-medium"
                        placeholder="120000"
                    />
                </div>
            </div>

            {/* Legend / Stats */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase">Selection Probabilities</h3>
                
                <LegendItem color="bg-emerald-500" label="Level 4 (Very High)" sub="4x Entries (+107%)" />
                <LegendItem color="bg-blue-500" label="Level 3 (High)" sub="3x Entries (+55%)" />
                <LegendItem color="bg-amber-500" label="Level 2 (Fair)" sub="2x Entries (+3%)" />
                <LegendItem color="bg-red-500" label="Level 1 (Low)" sub="1x Entry (-48%)" />
            </div>
        </div>

        {/* Footer Info */}
        <div className="mt-auto p-6 bg-gray-50 border-t border-gray-100">
            <div className="flex gap-3 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0" />
                <p>
                    Data complies with DHS Final Rule 2025-23853. Effective Feb 27, 2026.
                </p>
            </div>
        </div>
      </div>

      {/* 2. MAIN AREA (Map) */}
      <div className="flex-1 relative h-[500px] md:h-full">
         <WageMap socCode={selectedSoc} userSalary={salary === "" ? 0 : salary} />
         
         {/* Floating Badge */}
         <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-gray-600 border border-gray-200 z-10 hidden md:block">
            Data Source: DOL FLC Data Center (July 2025)
         </div>
      </div>

    </main>
  );
}

// Helper for the Legend
function LegendItem({ color, label, sub }: any) {
    return (
        <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${color} shadow-sm shrink-0`} />
            <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-[10px] text-gray-400">{sub}</span>
            </div>
        </div>
    );
}