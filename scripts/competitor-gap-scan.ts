/**
 * AI 상세페이지 경쟁사 랜딩 크롤 + Pagzly 기능 갭 리포트 (무료, API 없음).
 *
 * 실행: npx tsx scripts/competitor-gap-scan.ts
 * 산출: review/competitor-gap-2026.md, review/competitor-screens/*.png
 */
import fs from "fs";
import path from "path";
import { extractUrlSummary } from "../lib/url-crawler";
import { captureCompetitorLanding } from "./competitor-landing-capture";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "competitor-gap-2026.md");

type FeatureRow = {
  feature: string;
  pagzly: "yes" | "partial" | "no" | "n/a";
  hookable?: string;
  creazy?: string;
  gency?: string;
  alzal?: string;
  gabia?: string;
  sellerbiseo?: string;
  notes?: string;
};

const COMPETITORS = [
  { id: "hookable", name: "후커블", url: "https://www.hookable.ai/" },
  { id: "creazy", name: "크리에이지", url: "https://creazy.ai/" },
  { id: "gency", name: "GENCY", url: "https://gency.ai/" },
  { id: "alzal", name: "알잘AI", url: "https://alzal.kr/" },
  { id: "draph", name: "드랩아트", url: "https://draph.art/" },
  { id: "gabia", name: "가비아 AI 에디터", url: "https://aieditor.gabia.com/" },
  { id: "sellerbiseo", name: "셀러비서", url: "https://sellerbiseo.com/ko/" },
] as const;

const FEATURE_MATRIX: FeatureRow[] = [
  { feature: "카테고리별 섹션 슬롯 템플릿", pagzly: "yes", hookable: "yes", creazy: "yes", gency: "yes", alzal: "yes", gabia: "partial", sellerbiseo: "partial" },
  { feature: "반려동물 전용 템플릿", pagzly: "yes", hookable: "partial", creazy: "partial", gency: "no", alzal: "partial", gabia: "no", sellerbiseo: "no", notes: "2026-08-28 Pagzly PET 슬롯 추가" },
  { feature: "레퍼런스 이미지 → 색감·무드 분석", pagzly: "yes", hookable: "yes", creazy: "partial", gency: "partial", alzal: "partial", gabia: "partial", sellerbiseo: "no", notes: "Pagzly·후커블 핵심 노출 (45차)" },
  { feature: "경쟁사 URL → 차별화 포인트 구조화", pagzly: "yes", hookable: "partial", creazy: "no", gency: "no", alzal: "yes", gabia: "no", sellerbiseo: "partial", notes: "45차 extractCompetitorDifferentiation" },
  { feature: "패션 사진 역할(착장/디테일/코디) 안내", pagzly: "yes", hookable: "partial", creazy: "partial", gency: "yes", alzal: "partial", gabia: "no", sellerbiseo: "no" },
  { feature: "실제 리뷰 파일 → 후기 하이라이트", pagzly: "yes", hookable: "no", creazy: "no", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no", notes: "가짜 후기 모자이크는 비목표" },
  { feature: "리뷰 하이라이트 HTML export", pagzly: "yes", hookable: "partial", creazy: "partial", gency: "partial", alzal: "partial", gabia: "no", sellerbiseo: "no", notes: "2026-08-28 export 추가" },
  { feature: "모바일 sticky CTA 미리보기", pagzly: "yes", hookable: "yes", creazy: "yes", gency: "yes", alzal: "yes", gabia: "partial", sellerbiseo: "yes", notes: "sm:static 제거" },
  { feature: "에디토리얼 풀폭(사용 장면) 레이아웃", pagzly: "yes", hookable: "yes", creazy: "partial", gency: "yes", alzal: "partial", gabia: "no", sellerbiseo: "partial", notes: "2026-08-28 editorial bleed" },
  { feature: "분할 ZIP 다운로드", pagzly: "yes", hookable: "yes", creazy: "partial", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no", notes: "후커블식 다장 업로드" },
  { feature: "HTML export 전 섹션 타입 동기화", pagzly: "yes", hookable: "partial", creazy: "partial", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no", notes: "comparison_table·color·illustration" },
  { feature: "HTML export + JSON-LD", pagzly: "yes", hookable: "partial", creazy: "partial", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no" },
  { feature: "인스타 피드 탭", pagzly: "yes", hookable: "no", creazy: "partial", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no" },
  { feature: "블로그 글 초안·다운로드", pagzly: "yes", hookable: "no", creazy: "partial", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no" },
  { feature: "채팅형 섹션 편집", pagzly: "no", hookable: "partial", creazy: "yes", gency: "partial", alzal: "partial", gabia: "partial", sellerbiseo: "partial", notes: "3단계 로드맵" },
  { feature: "Figma 연동", pagzly: "no", hookable: "no", creazy: "yes", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no" },
  { feature: "판매자 GIF 삽입", pagzly: "yes", hookable: "partial", creazy: "yes", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no" },
  { feature: "AI 일상샷(사람·반려동물)", pagzly: "yes", hookable: "partial", creazy: "partial", gency: "partial", alzal: "no", gabia: "no", sellerbiseo: "partial" },
  { feature: "식약처/식품 컴플라이언스", pagzly: "yes", hookable: "no", creazy: "no", gency: "no", alzal: "no", gabia: "no", sellerbiseo: "no" },
];

const KEYWORD_SIGNALS: Record<string, string[]> = {
  hookable: ["스마트스토어", "쿠팡", "상세페이지", "AI", "이미지", "다운로드", "레퍼런스", "무드"],
  creazy: ["채팅", "Figma", "GIF", "상세페이지", "편집"],
  gency: ["패션", "의류", "코디", "디테일", "상세페이지"],
  alzal: ["상세페이지", "AI", "쇼핑몰", "마켓", "경쟁"],
  draph: ["상세페이지", "AI", "트렌드", "모바일", "숏폼"],
  gabia: ["AI", "에디터", "상세", "쇼핑몰", "호스팅"],
  sellerbiseo: ["쿠팡", "스마트스토어", "상세페이지", "AI", "자동"],
};

function statusEmoji(v?: string): string {
  if (v === "yes") return "✅";
  if (v === "partial") return "🟡";
  if (v === "no") return "❌";
  return "—";
}

function pagzlyGaps(matrix: FeatureRow[]): string[] {
  return matrix
    .filter((r) => r.pagzly === "no" || r.pagzly === "partial")
    .map((r) => `- **${r.feature}** (${r.pagzly})${r.notes ? ` — ${r.notes}` : ""}`);
}

async function crawlCompetitors() {
  const rows: string[] = [];
  for (const c of COMPETITORS) {
    const result = await extractUrlSummary(c.url);
    const shot = await captureCompetitorLanding(c.id, c.url);
    const shotLine = shot.ok
      ? `- 스크린샷: \`review/competitor-screens/${c.id}-landing.png\``
      : `- 스크린샷 실패: ${shot.reason}`;

    if (!result.ok) {
      rows.push(`### ${c.name}\n- URL: ${c.url}\n- 크롤 실패: ${result.reason}\n${shotLine}\n`);
      continue;
    }
    const text = `${result.title} ${result.excerpt}`.toLowerCase();
    const hits = (KEYWORD_SIGNALS[c.id] ?? []).filter((kw) => text.includes(kw.toLowerCase()));
    rows.push(
      `### ${c.name}\n` +
        `- URL: ${c.url}\n` +
        `- title: ${result.title}\n` +
        `- 키워드 히트: ${hits.length > 0 ? hits.join(", ") : "(없음)"}\n` +
        `- excerpt: ${result.excerpt.slice(0, 280)}${result.excerpt.length > 280 ? "…" : ""}\n` +
        `${shotLine}\n`,
    );
  }
  return rows.join("\n");
}

function matrixTable(matrix: FeatureRow[]): string {
  const header =
    "| 기능 | Pagzly | 후커블 | 크리에이지 | GENCY | 알잘AI | 가비아 | 셀러비서 | 비고 |\n|------|--------|--------|------------|-------|--------|--------|----------|------|\n";
  const body = matrix
    .map(
      (r) =>
        `| ${r.feature} | ${statusEmoji(r.pagzly)} | ${statusEmoji(r.hookable)} | ${statusEmoji(r.creazy)} | ${statusEmoji(r.gency)} | ${statusEmoji(r.alzal)} | ${statusEmoji(r.gabia)} | ${statusEmoji(r.sellerbiseo)} | ${r.notes ?? ""} |`,
    )
    .join("\n");
  return header + body;
}

async function main() {
  const crawled = await crawlCompetitors();
  const gaps = pagzlyGaps(FEATURE_MATRIX);
  const implemented = [
    "랜딩 'AI 자동 생성' 카드 — 레퍼런스 이미지 색감·무드 반영 문구 (45차 A)",
    "경쟁사 URL → extractCompetitorDifferentiation + draft 참고 자료 카드 노출 (45차 B)",
    "경쟁사 스캔 7곳 + 랜딩 풀페이지 스크린샷 review/competitor-screens/ (45차 C)",
    "반려동물 전용 `TemplateCategory` + PET 슬롯 (`lib/section-templates.ts`)",
    "리뷰 하이라이트 공유 삽입 + HTML export",
    "모바일 sticky CTA — preview `overflow-x-hidden`, CTA `sm:static` 제거",
    "다채널 PNG: 스마트스토어 860 / 쿠팡 780 / 토스·오늘의집 750",
    "에디토리얼 풀폭 레이아웃 + HTML export 동기화",
    "후커블식 분할 ZIP 다운로드",
    "마켓플레이스 6블록 CRO 가이드",
  ];

  const md = `# 경쟁사 갭 분석 (2026-08-31)

자동 생성: \`npx tsx scripts/competitor-gap-scan.ts\`

> 이번엔 텍스트뿐 아니라 실제 화면도 캡처함 — \`review/competitor-screens/\`

## 크롤 스냅샷

${crawled}

## 기능 매트릭스

${matrixTable(FEATURE_MATRIX)}

## Pagzly 잔여 갭 (partial / no)

${gaps.join("\n")}

## 이번 라운드 구현 (45차)

${implemented.map((i) => `- ${i}`).join("\n")}

## 신규 경쟁사 요약

- **가비아 AI 에디터** — 호스팅·쇼핑몰 인프라 기업의 AI 상세/에디터 진입. Pagzly 대비 레퍼런스·경쟁 URL 구조화·식품 컴플라이언스는 약세.
- **셀러비서** — 쿠팡·스마트스토어 타겟과 Pagzly와 동일. 알잘AI와 유사하게 마켓 자동화·상세 생성을 내세움.

## 명시적 비목표

- 가짜 후기·인증 마크·QC 그리드 모자이크
- Creazy급 Figma 네이티브 연동 (단기)
- 채팅형 전체 재작성 (3단계 — 섹션 patch 탭으로 부분 대응 중)

## 다음 우선순위

1. 채팅형 섹션 편집 UX (patch 탭 고도화)
2. \`npx tsx scripts/marketplace-pdp-scan.ts\` 정기 실행 — 마켓 PDP 모듈 커버리지
3. HTML export 인터랙티브 스와치 (마켓 script 정책 검증 후)
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md, "utf8");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
