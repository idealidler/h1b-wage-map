"use client";

import { useState, useEffect } from "react";
import { X, Database, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after 25 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 25000);
    
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    // Fixed at Top (Z-Index 300 puts it above everything including modals/navs)
    <div className="fixed top-0 inset-x-0 z-[300] bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white shadow-2xl animate-in slide-in-from-top duration-700 ease-out border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        {/* TEXT CONTENT */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="bg-white/10 p-2 rounded-full hidden sm:block shrink-0 animate-pulse">
            <Sparkles className="w-5 h-5 text-yellow-300" />
          </div>
          <div className="text-sm font-medium leading-snug">
            <span className="font-bold text-yellow-300 mr-2 uppercase tracking-wide text-xs">New Feature</span>
            <span className="block sm:inline">
                Find your SOC Code using your <span className="font-bold border-b border-blue-400 border-dashed">Employer's History</span>.
            </span>
            <span className="hidden md:inline text-blue-200 ml-2 text-xs">
               Search 200k+ filings by Company & Job Title.
            </span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3 shrink-0">
          <Link 
            href="/find-soc" 
            className="bg-white text-blue-900 hover:bg-blue-50 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1 group whitespace-nowrap"
          >
            Try it now
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1.5 rounded-full hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
            aria-label="Close banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}