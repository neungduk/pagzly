/**
 * 쇼핑몰·AI 상세페이지 경쟁/레퍼런스 크롤 + Pagzly 갭 리포트 (무료, API 없음).
 *
 * 실행: npx tsx scripts/marketplace-pdp-scan.ts
 * 산출: review/marketplace-pdp-learning-2026.md
 */
import fs from "fs";
import path from "path";
import { MARKETPLACE_PDP_MODULES, scoreMarketplaceModules } from "../lib/marketplace-pdp-patterns";
import { extractUrlSummary } from "../lib/url-crawler";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "marketplace-pdp-learning-2026.md");

type SiteGroup = {
  title: string;
  sites: Array<{ name: string; url: string; kind: "ai_tool" | "market_guide" | "reference" }>;
};

const SITE_GROUPS: SiteGroup[] = [
  {
    title: "AI 상세페이지 도구",
    sites: [
      { name: "후커블", url: "https://www.hookable.ai/", kind: "ai_tool" },
      { name: "크리에이지", url: "https://creazy.ai/", kind: "ai_tool" },
      { name: "GENCY", url: "https://gency.ai/", kind: "ai_tool" },
      { name: "알잘AI", url: "https://alzal.kr/", kind: "ai_tool" },
      { name: "드랩아트", url: "https://draph.art/", kind: "ai_tool" },
    ],
  },
  {
    title: "마켓·PDP 가이드 (공개)",
    sites: [
      {
        name: "스마트스토어 상세 가이드",
        url: "https://silmupack.com/smartstore-product-detail-page/",
        kind: "market_guide",
      },
      {
        name: "쇼핑몰 상세 구성",
        url: "https://sangbao.kr/blog/shopping-mall-detail-page-guide",
        kind: "market_guide",
      },
      {
        name: "2026 PDP 트렌드",
        url: "https://oscsnm.com/product-detail-page-design-2026/",
        kind: "market_guide",
      },
    ],
  },
];

const PAGZLY_GAPS = [
  {
    gap: "채팅형 섹션 편집",
    competitors: "크리에이지, 후커블(부분)",
    action: "patch 탭 고도화 (대규모 UX)",
    priority: "P2",
  },
  {
    gap: "Figma 네이티브 연동",
    competitors: "크리에이지",
    action: "비목표 (단기)",
    priority: "—",
  },
  {
    gap: "AR/3D 뷰어",
    competitors: "고가 에이전시 PDP",
    action: "비목표 (프로바이더 비용)",
    priority: "—",
  },
  {
    gap: "가짜 리뷰 모자이크",
    competitors: "일부 셀러 상세",
    action: "의도적 비목표 — 입력 리뷰만 review_highlight",
    priority: "—",
  },
];

const CODE_UPGRADES = [
  "lib/marketplace-pdp-patterns.ts — 6블록 CRO 가이드 + 혜택 키워드 추출",
  "lib/designer-detail-patterns.ts — 마켓 가이드 병합",
  "lib/extract-trust-chips.ts — 배송·혜택 칩 확장",
  "lib/enrich-product-sections.ts — keyFeatures → CTA 배지 보강",
  "lib/assign-section-images.ts — step_card 중복 배정 완화",
  "lib/food-compliance.ts — 원산지·알레르기·보관 슬롯 규율",
  "app/api/generate/route.ts — lengthGuide 로그·식품 슬롯 블록",
];

async function crawlAll() {
  const blocks: string[] = [];
  const moduleHits = new Map<string, number>();

  for (const group of SITE_GROUPS) {
    blocks.push(`## ${group.title}\n`);
    for (const site of group.sites) {
      const result = await extractUrlSummary(site.url);
      if (!result.ok) {
        blocks.push(`### ${site.name}\n- URL: ${site.url}\n- **크롤 실패**: ${result.reason}\n`);
        continue;
      }
      const text = `${result.title} ${result.excerpt}`;
      const scored = scoreMarketplaceModules(text);
      for (const row of scored) {
        if (row.hits > 0) {
          moduleHits.set(row.id, (moduleHits.get(row.id) ?? 0) + row.hits);
        }
      }
      const topModules = scored
        .filter((r) => r.hits > 0)
        .slice(0, 5)
        .map((r) => `${r.label}(${r.hits})`)
        .join(", ");

      blocks.push(
        `### ${site.name}\n` +
          `- URL: ${site.url}\n` +
          `- kind: ${site.kind}\n` +
          `- title: ${result.title}\n` +
          `- 모듈 신호: ${topModules || "(없음)"}\n` +
          `- excerpt: ${result.excerpt.slice(0, 240)}${result.excerpt.length > 240 ? "…" : ""}\n`,
      );
    }
  }
  return { body: blocks.join("\n"), moduleHits };
}

function moduleCoverageTable(hits: Map<string, number>): string {
  const header =
    "| 모듈 | 크롤 히트 | Pagzly 대응 |\n|------|-----------|-------------|\n";
  const rows = MARKETPLACE_PDP_MODULES.map((mod) => {
    const hit = hits.get(mod.id) ?? 0;
    return `| ${mod.label} | ${hit} | ${mod.pagzly} |`;
  });
  return header + rows.join("\n");
}

function gapsTable(): string {
  const header = "| 갭 | 경쟁사 | 조치 | 우선순위 |\n|-----|--------|------|----------|\n";
  return (
    header +
    PAGZLY_GAPS.map((g) => `| ${g.gap} | ${g.competitors} | ${g.action} | ${g.priority} |`).join(
      "\n",
    )
  );
}

async function main() {
  const { body: crawled, moduleHits } = await crawlAll();
  const md = `# 마켓플레이스·경쟁사 PDP 학습 (2026-08-28)

자동 생성: \`npx tsx scripts/marketplace-pdp-scan.ts\`

## 요약

- **크롤 대상**: AI 상세 도구 5곳 + 마켓 PDP 가이드 3곳 (공개 HTML, API 비용 $0)
- **학습 방법**: 랜딩/가이드 텍스트에서 Page Maker 모듈 키워드 매칭 → Pagzly 슬롯과 대조
- **비목표**: 가짜 리뷰, AR/3D, Figma 네이티브 (비용·정책)

## 크롤 스냅샷

${crawled}

## 모듈 커버리지 (크롤 히트 합산)

${moduleCoverageTable(moduleHits)}

## Pagzly vs 경쟁사 갭

${gapsTable()}

## 이번 라운드 코드 반영

${CODE_UPGRADES.map((u) => `- ${u}`).join("\n")}

## 디자이너·마켓 공통 원칙 (습득)

1. **6블록**: 대표 → 혜택 요약 → 이미지 스토리 → 신뢰 → FAQ → CTA
2. **8~12 스크롤 구간**: 짧은 구성 모드 + AI 요약으로 길이 압축
3. **혜택은 첫 스크롤**: 무료배송·당일발송·인증을 히어로 직후 스트립에
4. **사진 우선 리듬**: 풀폭 사용 장면 → 스텝 → 고시표
5. **근거 있는 신뢰만**: 입력 리뷰·인증·고시 — 날조 금지

## 다음 (코드만)

1. 채팅형 patch 탭 — 섹션별 재생성 UX
2. HTML export 인터랙티브 스와치 — 마켓 script 정책 검증 후
3. 이미지 dedup QA — assignDistinctSectionImages 회귀 테스트 강화
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md, "utf8");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
