import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // This function sets headers for your static files
  async headers() {
    return [
      {
        // TARGET 1: The Individual Job Files (e.g., /jobs/15-1252.json)
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
        // TARGET 2: Images and Icons (svg, ico, png, etc)
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
