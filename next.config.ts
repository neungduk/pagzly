import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 429차: 기본 보안 헤더(콘텐츠 형식 추측 금지·참조 주소 축소·다른 사이트의 프레임 삽입 금지)와 X-Powered-By 숨김
  poweredByHeader: false,
  async headers() {
    return [
      {
        // 430차: 셀프 호스팅 폰트 — export HTML(다른 주소에서 열림)도 불러올 수 있게 CORS 허용 + 장기 캐시
        source: "/fonts/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
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
