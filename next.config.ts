import type { NextConfig } from "next";
import { storageRemotePattern } from "./lib/storage/public-url";

// 459차: R2 공개 주소(NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL)가 설정돼 있을 때만 이미지 최적화 허용 호스트에 추가한다. 기존 Supabase 호스트는 이전이 끝나기 전까지 유지
const r2Pattern = storageRemotePattern();

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
      ...(r2Pattern ? [r2Pattern] : []),
    ],
  },
};

export default nextConfig;
