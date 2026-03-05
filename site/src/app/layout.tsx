import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

// --- SEO CONFIGURATION ---
export const metadata: Metadata = {
  metadataBase: new URL("https://www.wagelevelh1b.com"),
  title: {
    default: "H-1B Wage Level Map FY 2027 | Prevailing Wages by County",
    template: "%s | H1B Wage Map",
  },

  description:
    "Interactive H-1B wage level map using official U.S. Department of Labor data. Find SOC codes, compare prevailing wage levels (L1-L4), and check county data for FY 2027.",

  alternates: {
    canonical: "/",
  },

  keywords: [
    "H1B wage map",
    "H1B wage level map",
    "wage map H1B",
    "wagemap H1B",
    "H1B map",
    "H-1B prevailing wage",
    "SOC code finder",
    "LCA employer filings",
    "FY 2027 H1B",
    "county prevailing wage",
  ],

  openGraph: {
    title: "H-1B Wage Level Map FY 2027",
    description:
      "Find SOC codes and explore county-level prevailing wage levels (L1-L4) with official Department of Labor data.",
    url: "https://www.wagelevelh1b.com",
    siteName: "H1B Wage Map",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "H-1B Wage Level Map Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "H-1B Wage Level Map FY 2027",
    description:
      "Explore official county-level prevailing wages, find SOC codes, and compare wage levels.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "H1B Wage Map",
        alternateName: ["H1B Wage Level Map", "WageMap H1B"],
        url: "https://www.wagelevelh1b.com",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://www.wagelevelh1b.com/?soc={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "H1B Wage Level Map FY 2027",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "An interactive tool to explore H-1B prevailing wage levels by county, find SOC codes, and review FY 2027 rule references using official Department of Labor data.",
        author: {
          "@type": "Person",
          name: "Akshay Jain",
          url: "https://www.linkedin.com/in/akshayjain128/",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {children}
        <Analytics />
      </body>
    </html>
  );
}