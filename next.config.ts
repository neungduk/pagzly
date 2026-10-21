import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 429차: 기본 보안 헤더(콘텐츠 형식 추측 금지·참조 주소 축소·다른 사이트의 프레임 삽입 금지)와 X-Powered-By 숨김
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
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
