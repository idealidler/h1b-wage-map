import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import {
  FEDERAL_REGISTER_FAQ,
  FEDERAL_REGISTER_RULE_URL,
} from "@/lib/federalRegisterFaq";

export const metadata: Metadata = {
  title: "H-1B FY 2027 FAQ",
  description:
    "Frequently asked questions about the FY 2027 weighted H-1B selection rule, based on the official Federal Register publication.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FEDERAL_REGISTER_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main className="min-h-screen flex flex-col bg-[var(--background-alt)] font-sans">
      <Navbar />

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-grow">
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            FY 2027 H-1B Rule FAQ
          </h1>
          <p className="text-sm sm:text-base text-[var(--foreground-muted)] mt-2">
            Clear answers from the official Federal Register document about weighted selection, wage levels, and registration rules.
          </p>
          <a
            href={FEDERAL_REGISTER_RULE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex mt-3 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
          >
            Official source: Federal Register document
          </a>
        </section>

        <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-white p-5 sm:p-6 shadow-sm">
          <div className="space-y-4">
            {FEDERAL_REGISTER_FAQ.map((item) => (
              <article
                key={item.q}
                className="rounded-xl border border-[var(--border-subtle)] bg-gray-50/60 px-4 py-4"
              >
                <h2 className="text-sm sm:text-base font-semibold text-gray-900">{item.q}</h2>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <SiteFooter />
    </main>
  );
}
