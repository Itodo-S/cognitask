import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    // If NEXT_PUBLIC_API_URL is set (production), do not proxy. 
    // If not set (local dev), proxy to localhost:3000.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      return [
        { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      ];
    }
    return [
      { source: "/api/:path*", destination: "http://localhost:3000/api/:path*" },
    ];
  },
};

export default nextConfig;
