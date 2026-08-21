import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "xlsx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sblnthhayvrfkvaksest.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
