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

type CompetitorStatus = "yes" | "partial" | "no" | "n/a";

type FeatureRow = {
  feature: string;
  pagzly: CompetitorStatus;
  competitors: Record<string, CompetitorStatus>;
  notes?: string;
};

const COMPETITORS = [
  { id: "hookable", name: "후커블", url: "https://www.hookable.ai/" },
  { id: "creazy", name: "크리에이지", url: "https://creazy.app/ko" },
  { id: "gency", name: "GENCY", url: "https://gency.ai/" },
  { id: "alzal", name: "알잘AI", url: "https://alzal.kr/" },
  { id: "draph", name: "드랩아트", url: "https://draph.art/" },
  { id: "gabia", name: "가비아 AI 에디터", url: "https://aieditor.gabia.com/" },
  { id: "sellerbiseo", name: "셀러비서", url: "https://sellerbiseo.com/ko/" },
  { id: "sellercanvas", name: "셀러캔버스", url: "https://sellercanvas.com/" },
  { id: "kiwisnap", name: "키위스냅", url: "https://home.kiwisnap.net/" },
  { id: "edibot", name: "카페24 에디봇", url: "https://edibot.cafe24.com/" },
  { id: "qshop", name: "큐샵AI", url: "https://qshop.ai/" },
  { id: "miricanvas", name: "미리캔버스", url: "https://www.miricanvas.com/ko" },
] as const;

const FEATURE_MATRIX: FeatureRow[] = [
  {
    feature: "카테고리별 섹션 슬롯 템플릿",
    pagzly: "yes",
    competitors: {
      hookable: "yes",
      creazy: "yes",
      gency: "yes",
      alzal: "yes",
      gabia: "partial",
      sellerbiseo: "partial",
      sellercanvas: "partial",
      kiwisnap: "yes",
      edibot: "partial",
      qshop: "partial",
      miricanvas: "partial",
    },
  },
  {
    feature: "반려동물 전용 템플릿",
    pagzly: "yes",
    competitors: {
      hookable: "partial",
      creazy: "partial",
      gency: "no",
      alzal: "partial",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "no",
      miricanvas: "partial",
    },
    notes: "2026-08-28 Pagzly PET 슬롯 추가",
  },
  {
    feature: "레퍼런스 이미지 → 색감·무드 분석",
    pagzly: "yes",
    competitors: {
      hookable: "yes",
      creazy: "partial",
      gency: "partial",
      alzal: "partial",
      gabia: "partial",
      sellerbiseo: "no",
      sellercanvas: "partial",
      kiwisnap: "partial",
      edibot: "partial",
      qshop: "partial",
      miricanvas: "yes",
    },
    notes: "Pagzly·후커블 핵심 노출 (45차)",
  },
  {
    feature: "경쟁사 URL → 차별화 포인트 구조화",
    pagzly: "yes",
    competitors: {
      hookable: "partial",
      creazy: "no",
      gency: "no",
      alzal: "yes",
      gabia: "no",
      sellerbiseo: "partial",
      sellercanvas: "no",
      kiwisnap: "no",
      edibot: "no",
      qshop: "no",
      miricanvas: "no",
    },
    notes: "45차 extractCompetitorDifferentiation",
  },
  {
    feature: "패션 사진 역할(착장/디테일/코디) 안내",
    pagzly: "yes",
    competitors: {
      hookable: "partial",
      creazy: "partial",
      gency: "yes",
      alzal: "partial",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "yes",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "no",
      miricanvas: "partial",
    },
  },
  {
    feature: "실제 리뷰 파일 → 후기 하이라이트",
    pagzly: "yes",
    competitors: {
      hookable: "no",
      creazy: "no",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "no",
      edibot: "no",
      qshop: "no",
      miricanvas: "no",
    },
    notes: "가짜 후기 모자이크는 비목표",
  },
  {
    feature: "리뷰 하이라이트 HTML export",
    pagzly: "yes",
    competitors: {
      hookable: "partial",
      creazy: "partial",
      gency: "partial",
      alzal: "partial",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "no",
      miricanvas: "no",
    },
    notes: "2026-08-28 export 추가",
  },
  {
    feature: "모바일 sticky CTA 미리보기",
    pagzly: "yes",
    competitors: {
      hookable: "yes",
      creazy: "yes",
      gency: "yes",
      alzal: "yes",
      gabia: "partial",
      sellerbiseo: "yes",
      sellercanvas: "partial",
      kiwisnap: "partial",
      edibot: "partial",
      qshop: "partial",
      miricanvas: "partial",
    },
    notes: "sm:static 제거",
  },
  {
    feature: "에디토리얼 풀폭(사용 장면) 레이아웃",
    pagzly: "yes",
    competitors: {
      hookable: "yes",
      creazy: "partial",
      gency: "yes",
      alzal: "partial",
      gabia: "no",
      sellerbiseo: "partial",
      sellercanvas: "partial",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "partial",
      miricanvas: "partial",
    },
    notes: "2026-08-28 editorial bleed",
  },
  {
    feature: "분할 ZIP 다운로드",
    pagzly: "yes",
    competitors: {
      hookable: "yes",
      creazy: "partial",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "no",
      miricanvas: "no",
    },
    notes: "후커블식 다장 업로드",
  },
  {
    feature: "HTML export 전 섹션 타입 동기화",
    pagzly: "yes",
    competitors: {
      hookable: "partial",
      creazy: "partial",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "partial",
      edibot: "partial",
      qshop: "partial",
      miricanvas: "partial",
    },
    notes: "comparison_table·color·illustration",
  },
  {
    feature: "HTML export + JSON-LD",
    pagzly: "yes",
    competitors: {
      hookable: "partial",
      creazy: "partial",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "no",
      edibot: "no",
      qshop: "no",
      miricanvas: "no",
    },
  },
  {
    feature: "인스타 피드 탭",
    pagzly: "yes",
    competitors: {
      hookable: "no",
      creazy: "partial",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "no",
      miricanvas: "partial",
    },
  },
  {
    feature: "블로그 글 초안·다운로드",
    pagzly: "yes",
    competitors: {
      hookable: "no",
      creazy: "partial",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "no",
      miricanvas: "partial",
    },
  },
  {
    feature: "채팅형 섹션 편집",
    pagzly: "partial",
    competitors: {
      hookable: "partial",
      creazy: "yes",
      gency: "partial",
      alzal: "partial",
      gabia: "partial",
      sellerbiseo: "partial",
      sellercanvas: "partial",
      kiwisnap: "partial",
      edibot: "partial",
      qshop: "partial",
      miricanvas: "partial",
    },
    notes:
      "크리에이지: 3단계(전체/섹션/요소) + 추천 후속 채팅 + 레퍼런스·번역·승인. Pagzly 48차 Phase1=섹션 채팅 UX",
  },
  {
    feature: "Figma 연동",
    pagzly: "no",
    competitors: {
      hookable: "no",
      creazy: "yes",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "no",
      edibot: "no",
      qshop: "no",
      miricanvas: "partial",
    },
  },
  {
    feature: "판매자 GIF 삽입",
    pagzly: "yes",
    competitors: {
      hookable: "partial",
      creazy: "yes",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "no",
      miricanvas: "partial",
    },
  },
  {
    feature: "AI 일상샷(사람·반려동물)",
    pagzly: "yes",
    competitors: {
      hookable: "partial",
      creazy: "partial",
      gency: "partial",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "partial",
      sellercanvas: "partial",
      kiwisnap: "partial",
      edibot: "no",
      qshop: "partial",
      miricanvas: "yes",
    },
  },
  {
    feature: "식약처/식품 컴플라이언스",
    pagzly: "yes",
    competitors: {
      hookable: "no",
      creazy: "no",
      gency: "no",
      alzal: "no",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "no",
      edibot: "no",
      qshop: "no",
      miricanvas: "no",
    },
  },
  {
    feature: "쇼핑몰 플랫폼 네이티브 연동",
    pagzly: "no",
    competitors: {
      hookable: "partial",
      creazy: "partial",
      gency: "no",
      alzal: "partial",
      gabia: "yes",
      sellerbiseo: "partial",
      sellercanvas: "no",
      kiwisnap: "partial",
      edibot: "yes",
      qshop: "yes",
      miricanvas: "partial",
    },
    notes: "48차 신규 — 카페24·큐샵AI·가비아 호스팅 연동",
  },
  {
    feature: "다국어 번역(디자인 유지)",
    pagzly: "no",
    competitors: {
      hookable: "partial",
      creazy: "yes",
      gency: "no",
      alzal: "partial",
      gabia: "no",
      sellerbiseo: "no",
      sellercanvas: "no",
      kiwisnap: "yes",
      edibot: "no",
      qshop: "no",
      miricanvas: "partial",
    },
    notes: "48차 신규",
  },
];

const KEYWORD_SIGNALS: Record<string, string[]> = {
  hookable: ["스마트스토어", "쿠팡", "상세페이지", "AI", "이미지", "다운로드", "레퍼런스", "무드"],
  creazy: ["채팅", "Figma", "GIF", "상세페이지", "편집", "번역"],
  gency: ["패션", "의류", "코디", "디테일", "상세페이지"],
  alzal: ["상세페이지", "AI", "쇼핑몰", "마켓", "경쟁"],
  draph: ["상세페이지", "AI", "트렌드", "모바일", "숏폼"],
  gabia: ["AI", "에디터", "상세", "쇼핑몰", "호스팅"],
  sellerbiseo: ["쿠팡", "스마트스토어", "상세페이지", "AI", "자동"],
  sellercanvas: ["패션", "의류", "이미지", "업로드", "상세", "디자인"],
  kiwisnap: ["템플릿", "상세페이지", "AI", "번역", "스마트스토어"],
  edibot: ["카페24", "쇼핑몰", "상세", "AI", "카테고리"],
  qshop: ["쇼핑몰", "상세페이지", "AI", "3분", "생성"],
  miricanvas: ["템플릿", "스마트스토어", "상세", "AI", "디자인"],
};

const CREAZY_CHAT_DETAIL = `**크리에이지 채팅형 편집 (3단계)** — creazy.app/ko/tutorial/features/ai-chat 기준
1. **전체 페이지**: 자유 입력(섹션 생성·이미지·문구). 막막하면 추천 후속 채팅 3개.
2. **섹션 단위**: 섹션 툴바 "채팅에서 수정하기" → 해당 섹션만 컨텍스트.
3. **요소 단위**: 이미지/텍스트 클릭 → 그 요소만 채팅에 추가.
- 레퍼런스 이미지 업로드 + 적용 위치 선택
- 외국어 상세 → 디자인 유지·텍스트만 한국어 번역
- 이미지·비디오 생성은 실행 전 승인 (프로젝트 단위 "항상 승인" 설정 가능)`;

function statusEmoji(v?: CompetitorStatus): string {
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
    let extra = "";
    if (c.id === "creazy") {
      extra = `\n- 채팅형 편집:\n${CREAZY_CHAT_DETAIL.split("\n").map((l) => `  ${l}`).join("\n")}\n`;
    }
    rows.push(
      `### ${c.name}\n` +
        `- URL: ${c.url}\n` +
        `- title: ${result.title}\n` +
        `- 키워드 히트: ${hits.length > 0 ? hits.join(", ") : "(없음)"}\n` +
        `- excerpt: ${result.excerpt.slice(0, 280)}${result.excerpt.length > 280 ? "…" : ""}\n` +
        `${shotLine}${extra}\n`,
    );
  }
  return rows.join("\n");
}

function matrixTable(matrix: FeatureRow[]): string {
  const cols = COMPETITORS.map((c) => c.name);
  const header =
    `| 기능 | Pagzly | ${cols.join(" | ")} | 비고 |\n` +
    `|------|--------|${cols.map(() => "--------").join("|")}|------|\n`;
  const body = matrix
    .map((r) => {
      const compCells = COMPETITORS.map((c) => statusEmoji(r.competitors[c.id])).join(" | ");
      return `| ${r.feature} | ${statusEmoji(r.pagzly)} | ${compCells} | ${r.notes ?? ""} |`;
    })
    .join("\n");
  return header + body;
}

async function main() {
  const crawled = await crawlCompetitors();
  const gaps = pagzlyGaps(FEATURE_MATRIX);
  const implemented = [
    "경쟁사 스캔 12곳 — creazy.app/ko URL 수정 + 신규 5곳 (48차 Track 1)",
    "섹션 채팅형 편집 Phase 1 — 대화 이력·추천 chip·에러 버블 (48차 Track 3)",
    "여백 리듬 미세 상향 — SECTION_BLOCK_PAD generous/compact (48차 Track 2-A)",
    "GIF 업로드 discoverability 안내 문구 (48차 Track 2-B)",
    "컬러 스와치 CSS-only 인터랙션 — 미리보기·HTML export (48차 Track 2-C)",
    "랜딩 'AI 자동 생성' 카드 — 레퍼런스 이미지 색감·무드 반영 문구 (45차 A)",
    "경쟁사 URL → extractCompetitorDifferentiation + draft 참고 자료 카드 노출 (45차 B)",
    "반려동물 전용 TemplateCategory + PET 슬롯",
    "리뷰 하이라이트 공유 삽입 + HTML export",
    "모바일 sticky CTA — preview overflow-x-hidden, CTA sm:static 제거",
    "다채널 PNG: 스마트스토어 860 / 쿠팡 780 / 토스·오늘의집 750",
    "에디토리얼 풀폭 레이아웃 + HTML export 동기화",
    "후커블식 분할 ZIP 다운로드",
  ];

  const md = `# 경쟁사 갭 분석 (2026-08-31)

자동 생성: \`npx tsx scripts/competitor-gap-scan.ts\`

> 텍스트 + 풀페이지 스크린샷 — \`review/competitor-screens/\`
> 48차: creazy URL 수정(\`creazy.app/ko\`), 신규 5곳 추가, 크리에이지 채팅 3단계 구조 반영

## 크롤 스냅샷

${crawled}

## 기능 매트릭스

${matrixTable(FEATURE_MATRIX)}

## Pagzly 잔여 갭 (partial / no)

${gaps.join("\n")}

## 이번 라운드 구현 (48차)

${implemented.map((i) => `- ${i}`).join("\n")}

## 신규 경쟁사 요약 (48차)

- **셀러캔버스** — 패션 의류 특화. 이미지 업로드 → 제품 분석 → 자동 디자인 배치.
- **키위스냅** — 2000+ 템플릿, AI 이미지 정렬·태그·MD 코멘트, 다국어 번역.
- **카페24 에디봇** — 카페24 쇼핑몰 네이티브 연동, 자동 카테고리 인식.
- **큐샵AI** — 3분 내 쇼핑몰+상세페이지 올인원 생성.
- **미리캔버스** — 5만+ 템플릿, 스마트스토어 860×1100, AI 실사(미리클).
- **크리에이지 (URL 수정)** — \`creazy.ai\` → \`creazy.app/ko\`. 채팅형 편집 3단계 벤치마크.

## 명시적 비목표

- 가짜 후기·인증 마크·QC 그리드 모자이크
- Creazy급 Figma 네이티브 연동 (단기)
- 채팅형 전체 페이지/요소 단위 편집 (Phase 2/3 — 제안만)

## 다음 우선순위

1. 채팅형 섹션 편집 Phase 2 — 전체 페이지 단위 (슬롯·순서 변경, 승인 필요)
2. 채팅형 섹션 편집 Phase 3 — 요소 단위 클릭·레퍼런스 첨부
3. \`npx tsx scripts/marketplace-pdp-scan.ts\` 정기 실행
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md, "utf8");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
