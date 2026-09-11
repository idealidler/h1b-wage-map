import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// --- SEO CONFIGURATION ---
export const metadata: Metadata = {
  metadataBase: new URL("https://www.wagelevelh1b.com"),
  title: {
    default: "H-1B Wage Map | OFLC Data Series 07/2026 - 06/2027",
    template: "%s | H1B Wage Map",
  },

  description:
    "Interactive H-1B wage map using the latest published U.S. Department of Labor OFLC reference data series for July 2026 through June 2027.",

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
    "OFLC wage data 2026 2027",
    "county prevailing wage",
  ],

  openGraph: {
    title: "H-1B Wage Map | OFLC Data Series 07/2026 - 06/2027",
    description:
      "Find SOC codes and explore county-level prevailing wage levels from U.S. Department of Labor OFLC Wage Year 2026-27 data.",
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
    title: "H-1B Wage Map | OFLC Data Series 07/2026 - 06/2027",
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
        name: "H1B Wage Map | OFLC Data Series 07/2026 - 06/2027",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "An interactive H-1B wage map using official Department of Labor OFLC reference data from July 2026 through June 2027.",
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
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
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