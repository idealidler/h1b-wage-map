"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map as MapIcon, Sparkles, Building2, CircleHelp, Menu } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useState, useEffect } from "react";

const navItems = [
  { path: "/", label: "Wage Map", icon: null },
  { path: "/#find-soc-employer", label: "SOC by Employer", icon: Building2 },
  { path: "/find", label: "Find SOC with AI", icon: Sparkles },
  { path: "/faq", label: "FAQ", icon: CircleHelp },
];

export default function Navbar() {
  const pathname = usePathname();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [activeHash, setActiveHash] = useState<string>("");

  useEffect(() => {
    const handleHashChange = () => setActiveHash(window.location.hash);
    
    const handleScroll = () => {
      if (window.location.pathname !== "/") return;
      
      const employerSection = document.getElementById("find-soc-employer");
      if (employerSection) {
        const rect = employerSection.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.6 && rect.bottom >= 0) {
          setActiveHash("#find-soc-employer");
        } else {
          setActiveHash("");
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Strict sync on mount and pathname change
    if (pathname === "/") {
        handleScroll();
        if (window.location.hash) setActiveHash(window.location.hash);
    } else {
        setActiveHash(""); // Instantly clear hash highlight if not on home page
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  const markEmployerIntent = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("focus-employer-soc", "1");
    // If we are already on the home page, trigger the scroll event immediately
    if (pathname === "/") {
      window.dispatchEvent(new Event("focus-employer-soc"));
    }
  };

  // Bulletproof Active State Check
  const getIsActive = (itemPath: string) => {
    if (itemPath === "/") return pathname === "/" && activeHash !== "#find-soc-employer";
    if (itemPath === "/#find-soc-employer") return pathname === "/" && activeHash === "#find-soc-employer";
    return pathname === itemPath;
  };

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-[100] w-full border-b border-[var(--border-subtle)] bg-white/60 backdrop-blur-xl transition-all"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link
          href="/"
          onClick={() => setActiveHash("")}
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] rounded-lg"
          title="Interactive Salary Explorer"
        >
          <div className="bg-[var(--foreground)] p-1.5 rounded-lg shadow-[0_2px_10px_rgba(15,23,42,0.2)] group-hover:scale-105 transition-transform duration-300">
            <MapIcon className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold text-[var(--foreground)] tracking-tight">
            H1B Wage<span className="text-[var(--foreground-muted)] font-medium">Map</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = getIsActive(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={item.path === "/#find-soc-employer" ? markEmployerIntent : undefined}
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors z-10 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
                  isActive ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 bg-[var(--surface-muted)] rounded-full -z-10 border border-[var(--border-subtle)] shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {hoveredPath === item.path && !isActive && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 bg-[var(--background-alt)] rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/find"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--foreground)] px-4 py-2 rounded-full shadow-md hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            AI Match
          </Link>
          <button className="p-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] rounded-full transition-colors border border-transparent">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}