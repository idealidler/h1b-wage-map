import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // This function sets headers for your static files
  async headers() {
    return [
      {
        // TARGET 1: Versioned wage files (e.g., /jobs-2026-27/15-1252.json)
        // These effectively never change, so we cache them aggressively
        source: "/jobs-2026-27/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable", // Cache for 1 year
          },
        ],
      },
      {
        // TARGET 2: Images and Icons (svg, ico, png, etc)
        source: "/:all*(svg|jpg|png|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Generated employer and SOC reference data is versioned/static.
        source: "/db/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Small reference files are replaced by new names when data changes.
        source: "/:path*(soc_data|job-index).json",
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
