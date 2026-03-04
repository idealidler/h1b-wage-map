import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

// --- SEO CONFIGURATION ---
export const metadata: Metadata = {
  // 1. Set your Base URL so images/links work correctly
  metadataBase: new URL('https://wagelevelh1b.com'), 
  
  // 2. The "Clickbait" Title that ranks
  title: {
    default: "H1B Wage Map 2027 - Weighted Selection Probabilities (FY2027)",
    template: "%s | H1B Wage Map",
  },
  
  // 3. The description that shows up in Google Snippets
  description: "Explore H-1B weighted selection probabilities under the FY 2027 rule. Interactive map of official Department of Labor wage levels (Level 1-4) by role and county.",
  
  // 4. Keywords for Search Engines
  keywords: [
    "H1B Weighted Selection 2027", 
    "Weighted Selection Rule", 
    "H1B Wage Rule",
    "H1B Wage Map", 
    "LCA Search", 
    "H1B Wage Map",
    "H1B Calculator", 
    "FY 2027 Visa Rules", 
    "Wage Level Checker"
  ],

  // 5. Social Media Sharing (Open Graph)
  openGraph: {
    title: "H1B Wage Map 2027 - Weighted Selection Probabilities",
    description: "See how salary level affects weighted entries under FY2027 H-1B selection. Interactive U.S. county wage map.",
    url: "https://wagelevelh1b.com",
    siteName: "H1B Wage Map",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png", // Make sure to add a screenshot named 'og-image.png' to your 'public' folder!
        width: 1200,
        height: 630,
        alt: "H1B Wage Map Preview",
      },
    ],
  },

  // 6. Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "H1B Wage Map 2027",
    description: "Explore H-1B weighted selection probabilities under the FY 2027 rule.",
  },

  // 7. Robot crawling instructions
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // --- JSON-LD STRUCTURED DATA (The "Rich Snippet" Trick) ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "H1B Wage Map FY 2027",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "description": "A tool to explore H-1B weighted selection probabilities under the FY 2027 rule using official Department of Labor wage data.",
    "author": {
      "@type": "Person",
      "name": "Akshay Jain",
      "url": "https://www.linkedin.com/in/akshayjain128/"
    }
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Inject JSON-LD for Google */}
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
