"use client";

import { Github, Linkedin } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="bg-white border-t border-slate-200/60 mt-8 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Disclaimers & Contact */}
        <div className="text-center md:text-left space-y-1">
          <p className="text-sm text-slate-600 font-medium">Official wage data from U.S. Department of Labor.</p>
          <p className="text-xs text-slate-500">Not legal advice. For informational purposes only.</p>
          <p className="text-xs text-slate-500 pt-1.5">
            If this helped, I would love to hear from you. Drop me a note on{" "}
            <a
              href="https://www.linkedin.com/in/akshayjain128/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-900 hover:text-slate-700 font-semibold underline decoration-slate-300 hover:decoration-slate-500 underline-offset-2 transition-all duration-200"
            >
              LinkedIn
            </a>
            .
          </p>
        </div>

        {/* Developer Credit & Socials */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <span className="text-sm font-medium text-slate-600">Developed by Akshay Jain</span>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/in/akshayjain128/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-900 hover:scale-110 transition-all duration-200"
              aria-label="LinkedIn profile"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/idealidler"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-900 hover:scale-110 transition-all duration-200"
              aria-label="GitHub profile"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
        
      </div>
    </footer>
  );
}