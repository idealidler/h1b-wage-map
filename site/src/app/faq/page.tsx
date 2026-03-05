"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { ChevronDown, Scale, UserCheck, ShieldAlert, CalendarClock, ExternalLink, FileText } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";

const FEDERAL_REGISTER_RULE_URL = "https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b";

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const KEY_TAKEAWAYS = [
  {
    icon: Scale,
    title: "The Weighted Lottery",
    desc: "The purely random lottery is replaced with a wage-weighted system. Beneficiaries receive 1 to 4 entries based on their OEWS wage level (Level IV = 4 entries, Level I = 1 entry).",
    color: "text-[var(--brand-primary)]",
    bg: "bg-[var(--brand-primary-muted)]",
    border: "border-blue-200"
  },
  {
    icon: UserCheck,
    title: "Unique Beneficiaries Only",
    desc: "Each individual is entered into the lottery pool only once. Filing multiple registrations across different employers does not improve selection odds.",
    color: "text-[var(--brand-accent)]",
    bg: "bg-amber-50",
    border: "border-amber-200"
  },
  {
    icon: ShieldAlert,
    title: "Strict Compliance",
    desc: "Registrations must represent a genuine, bona fide job offer. The final petition must strictly match the registration details (SOC, location, and wage level).",
    color: "text-[var(--brand-warning)]",
    bg: "bg-red-50",
    border: "border-red-200"
  },
  {
    icon: CalendarClock,
    title: "FY 2027 Timeline",
    desc: "The final rule takes effect on February 27, 2026, and will govern the FY2027 cap season. Registration dates will be announced 30 days in advance.",
    color: "text-[var(--brand-success)]",
    bg: "bg-emerald-50",
    border: "border-emerald-200"
  }
];

const FAQ_DATA = [
  {
    q: "What is the new H-1B “weighted selection process”?",
    a: "Instead of a pure lottery, USCIS will give multiple entries to applicants with higher wage levels. Each unique beneficiary is entered into the pool once, but the number of entries depends on their wage: Level IV gets 4 entries, Level III gets 3, Level II gets 2, and Level I gets 1 entry. This gives higher-paid positions better odds."
  },
  {
    q: "What information must be included in the registration?",
    a: "Registrants must provide the highest OEWS wage level that the proffered wage meets, the relevant SOC code, the geographic area, and the beneficiary’s valid passport or travel document details. Each beneficiary should be registered under the single passport they will use to enter the U.S."
  },
  {
    q: "How do I pick the OEWS wage level on the registration?",
    a: "You must select the highest OEWS wage level (I through IV) such that the proffered wage is at least that level’s wage. For example, if your offered wage is $60,000, Level II is $55,000, and Level III is $70,000, you select Level II because the wage equals or exceeds Level II but is less than Level III."
  },
  {
    q: "My pay is given as a range. Which number do I use?",
    a: "Use the bottom of the wage range to determine the level. Take the lowest wage in the offered range, and pick the OEWS level that wage meets or exceeds."
  },
  {
    q: "How do I handle multiple locations or multiple positions?",
    a: "If the beneficiary will work in more than one location, you must pick the lowest wage level that covers all locations/positions. If Location A corresponds to Level II and Location B to Level III, you must select Level II on the registration."
  },
  {
    q: "My wage is based on a private survey. How do I select the level?",
    a: "If your proffered wage comes from a non-OEWS source and is below the OEWS Level I wage, you still select Wage Level I. If it is higher, compare it to the OEWS wage levels similarly: choose the highest OEWS level that the wage equals or exceeds."
  },
  {
    q: "What if there aren’t enough registrations to fill the cap?",
    a: "If USCIS finds fewer unique beneficiaries than the number of cap visas, it will notify all registrants that they are selected. USCIS will then keep the registration period open and continue accepting registrations until it has enough to meet the cap."
  },
  {
    q: "Can the employer change the job location or title after registration?",
    a: "Generally, no. The petition should match the registered position. Any change must still be a bona fide job offer consistent with the original registration’s terms."
  }
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_DATA.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a, 
      },
    })),
  };

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="min-h-screen flex flex-col bg-[var(--background-alt)] font-sans">
      <Navbar />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-grow flex flex-col gap-6"
      >
        <motion.section variants={itemVariants} className="text-center space-y-4 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[var(--brand-primary)] text-xs font-bold uppercase tracking-widest shadow-sm">
            <FileText className="w-3.5 h-3.5" /> Policy Research
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--foreground)] tracking-tight">
            FY 2027 H-1B Rule FAQ
          </h1>
          <p className="text-base sm:text-lg text-[var(--foreground-muted)] max-w-2xl mx-auto font-medium leading-relaxed">
            Clear, actionable answers on the new weighted selection process, wage mapping, and compliance requirements based on the official DHS ruling.
          </p>
          <a
            href={FEDERAL_REGISTER_RULE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-xl bg-white border border-[var(--border-subtle)] text-sm font-bold text-[var(--foreground)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:shadow-md transition-all duration-300"
          >
            Read Official Federal Register Document
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.section>

        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KEY_TAKEAWAYS.map((takeaway, idx) => {
            const Icon = takeaway.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-[var(--border-subtle)] p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl border ${takeaway.bg} ${takeaway.border}`}>
                    <Icon className={`w-6 h-6 ${takeaway.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--foreground)] text-[17px]">{takeaway.title}</h3>
                    <p className="text-sm text-[var(--foreground-muted)] font-medium mt-1.5 leading-relaxed">
                      {takeaway.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.section>

        <motion.section variants={itemVariants} className="mt-4 rounded-3xl border border-[var(--border-subtle)] bg-white overflow-hidden shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
          <div className="bg-[var(--surface-muted)] border-b border-[var(--border-subtle)] px-6 py-4">
            <h2 className="font-bold text-[var(--foreground)] uppercase tracking-widest text-xs">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {FAQ_DATA.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx} className="group">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className={`w-full text-left px-6 py-5 flex items-start justify-between gap-4 transition-colors ${
                      isOpen ? "bg-[var(--brand-primary-muted)]/30" : "hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <span className={`font-bold text-[16px] sm:text-[17px] pr-4 transition-colors ${
                      isOpen ? "text-[var(--brand-primary)]" : "text-[var(--foreground)] group-hover:text-[var(--brand-primary)]"
                    }`}>
                      {item.q}
                    </span>
                    <span className={`p-1 rounded-md transition-all duration-300 shrink-0 ${
                      isOpen ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--foreground-muted)] group-hover:bg-white border border-[var(--border-subtle)]"
                    }`}>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                      >
                        <div className="px-6 pb-6 pt-2 text-[15px] text-[var(--foreground-muted)] font-medium leading-relaxed bg-[var(--brand-primary-muted)]/30">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.section>

      </motion.div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <SiteFooter />
    </main>
  );
}