import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find SOC Using AI",
  description:
    "Describe your role and get SOC code matches using official SOC reference data. Then open the county wage map instantly.",
  alternates: {
    canonical: "/find",
  },
  openGraph: {
    title: "Find SOC Using AI | H1B Wage Map",
    description:
      "Use AI-assisted SOC matching to identify the best occupation code and open county-level prevailing wage data.",
    url: "https://www.wagelevelh1b.com/find",
    type: "website",
  },
};

export default function FindLayout({ children }: { children: React.ReactNode }) {
  return children;
}
