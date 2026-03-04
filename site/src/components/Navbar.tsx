"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map as MapIcon, Sparkles, Building2, CircleHelp } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const markEmployerIntent = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("focus-employer-soc", "1");
    window.dispatchEvent(new Event("focus-employer-soc"));
  };

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-[100] w-full border-b border-[var(--border-subtle)] bg-white/90 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex flex-col group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] rounded-lg"
          title="Interactive Salary Explorer"
        >
          <div className="flex items-center gap-2">
              <div className="bg-[var(--brand-primary)] p-1.5 rounded-md shadow-sm group-hover:bg-[#3367D6] transition-colors">
                <MapIcon className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold text-[var(--foreground)] tracking-tight">
                H1B Wage<span className="text-[var(--brand-primary)]">Map</span>
              </span>
          </div>
          <span className="text-[10px] text-gray-500 font-medium ml-8 -mt-1 hidden sm:block">
            Interactive Salary Explorer
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] p-1 bg-white/70">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
              pathname === "/"
                ? "bg-blue-50 text-[var(--brand-primary)]"
                : "text-gray-600 hover:text-[var(--brand-primary)] hover:bg-gray-50"
            }`}
          >
            Wage Map
          </Link>
          <Link
            href="/#find-soc-employer"
            onClick={markEmployerIntent}
            className="px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 text-gray-600 hover:text-[var(--brand-primary)] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          >
            <Building2 className="w-4 h-4" aria-hidden="true" />
            Find SOC using Employer
          </Link>
          <Link
            href="/find"
            aria-current={pathname === "/find" ? "page" : undefined}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
              pathname === "/find"
                ? "bg-blue-50 text-[var(--brand-primary)]"
                : "text-gray-600 hover:text-[var(--brand-primary)] hover:bg-gray-50"
            }`}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Find SOC using AI
          </Link>
          <Link
            href="/faq"
            aria-current={pathname === "/faq" ? "page" : undefined}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
              pathname === "/faq"
                ? "bg-blue-50 text-[var(--brand-primary)]"
                : "text-gray-600 hover:text-[var(--brand-primary)] hover:bg-gray-50"
            }`}
          >
            <CircleHelp className="w-4 h-4" aria-hidden="true" />
            FAQ
          </Link>
        </div>

        <div className="flex items-center gap-3">
           <Link
              href="/faq"
              className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
           >
              <CircleHelp className="w-3.5 h-3.5" aria-hidden="true" />
              FAQ
           </Link>
           <Link
              href="/#find-soc-employer"
              onClick={markEmployerIntent}
              className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] bg-blue-50 border border-blue-100 px-3 py-2 rounded-md hover:bg-blue-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
           >
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
              SOC by Employer
           </Link>
           <Link
              href="/find"
              className="md:hidden flex items-center gap-1.5 text-xs font-bold text-white bg-[var(--brand-primary)] px-3 py-2 rounded-md hover:bg-[#3367D6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
           >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Find SOC using AI
           </Link>
        </div>
      </div>

    </nav>
  );
}
