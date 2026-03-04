"use client";

import { Github, Linkedin } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="bg-white border-t border-[var(--border-subtle)] mt-6 py-6">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="text-center md:text-left">
          <p className="text-sm text-gray-600 font-medium">Official wage data from U.S. Department of Labor.</p>
          <p className="text-xs text-gray-500 mt-1">Not legal advice. For informational purposes only.</p>
          <p className="text-xs text-gray-600 mt-1.5">
            If this helped, I would love to hear from you, please drop me a note on my{" "}
            <a
              href="https://www.linkedin.com/in/akshayjain128/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-primary)] hover:underline font-medium"
            >
              LinkedIn
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-sm font-medium text-gray-700">Developed by Akshay Jain</span>
          <a
            href="https://www.linkedin.com/in/akshayjain128/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-[var(--brand-primary)] transition-colors"
            aria-label="LinkedIn profile"
          >
            <Linkedin className="w-5 h-5" />
          </a>
          <a
            href="https://github.com/idealidler"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-[var(--brand-primary)] transition-colors"
            aria-label="GitHub profile"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
