import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // This function sets headers for your static files
  async headers() {
    return [
      {
        // TARGET 1: The Job Index (Fetched on every page load)
        source: "/job-index.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800", // Cache for 1 day, keep stale version for 1 week
          },
        ],
      },
      {
        // TARGET 2: The Individual Job Files (e.g., /jobs/15-1252.json)
        // These effectively never change, so we cache them aggressively
        source: "/jobs/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable", // Cache for 1 year
          },
        ],
      },
      {
        // TARGET 3: Images and Icons (svg, ico, png, etc)
        source: "/:all*(svg|jpg|png|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;