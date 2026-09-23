import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "xlsx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qnstsrplqzoqlndojuyw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
