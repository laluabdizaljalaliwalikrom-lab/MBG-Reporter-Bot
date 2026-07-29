import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@resvg/resvg-js'],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
