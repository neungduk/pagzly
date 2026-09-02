/**
 * 54차 — quick_points 이미지 배정 우선순위 검증 (API 비용 없음)
 *   npx tsx scripts/verify-54cha-quick-points.ts
 */

import fs from "fs";
import path from "path";
import { assignDistinctSectionImages } from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";
import type { ProductImageRole } from "../lib/image-roles";

const ROOT = path.join(__dirname, "..");
const REPORT = path.join(ROOT, "review", "54cha-quick-points.md");

function quickPointSection(heading: string): DetailSection {
  return {
    type: "image_text",
    slot: "quick_points",
    layout: "compact",
    heading,
    body: "테스트 본문",
    imageIndex: 99,
    imagePosition: "left",
  };
}

function detailZoomSection(): DetailSection {
  return {
    type: "image_text",
    slot: "detail_zoom",
    heading: "디테일",
    body: "확대 컷",
    imageIndex: 99,
    imagePosition: "right",
  };
}

function imageIndexOf(section: DetailSection): number {
  if (section.type === "image_text") return section.imageIndex;
  throw new Error("expected image_text");
}

type Scenario = {
  name: string;
  category: string;
  imageCount: number;
  roles: ProductImageRole[];
  sections: DetailSection[];
  expect: (assigned: DetailSection[]) => { ok: boolean; detail: string };
};

const PET_MACRO_ROLES: ProductImageRole[] = [
  "hero",
  "detail",
  "detail",
  "detail",
  "package",
  "lifestyle",
  "detail",
  "other",
];

const DETAIL_ONLY_ROLES: ProductImageRole[] = Array(8).fill("detail") as ProductImageRole[];

const scenarios: Scenario[] = [
  {
    name: "반려동물 — package/hero 우선 (매크로 detail 다수)",
    category: "반려동물",
    imageCount: 8,
    roles: PET_MACRO_ROLES,
    sections: [quickPointSection("하루 1~2개")],
    expect: (assigned) => {
      const idx = imageIndexOf(assigned[0]);
      const ok = idx === 4 || idx === 0;
      return {
        ok,
        detail: `assigned imageIndex=${idx} (expect package@4 or hero@0, not detail@1)`,
      };
    },
  },
  {
    name: "폴백 — package/hero 없음, detail만",
    category: "반려동물",
    imageCount: 8,
    roles: DETAIL_ONLY_ROLES,
    sections: [quickPointSection("포인트")],
    expect: (assigned) => {
      const idx = imageIndexOf(assigned[0]);
      const ok = idx === 0;
      return {
        ok,
        detail: `assigned imageIndex=${idx} (all-detail roles → first detail@0, no package/hero)`,
      };
    },
  },
  {
    name: "detail_zoom 회귀 없음 — 여전히 detail 우선",
    category: "반려동물",
    imageCount: 8,
    roles: PET_MACRO_ROLES,
    sections: [detailZoomSection()],
    expect: (assigned) => {
      const idx = imageIndexOf(assigned[0]);
      const ok = idx === 1;
      return {
        ok,
        detail: `assigned imageIndex=${idx} (expect detail@1)`,
      };
    },
  },
  {
    name: "화장품 — 기본 역할 순서에서 package 우선",
    category: "화장품/뷰티",
    imageCount: 8,
    roles: [], // normalize → hero@0 detail@1 lifestyle@2 package@3
    sections: [quickPointSection("보습")],
    expect: (assigned) => {
      const idx = imageIndexOf(assigned[0]);
      const ok = idx === 3;
      return {
        ok,
        detail: `assigned imageIndex=${idx} (expect default package@3, not detail@1)`,
      };
    },
  },
  {
    name: "전자제품 — package 없으면 hero 폴백",
    category: "전자제품",
    imageCount: 6,
    roles: ["hero", "detail", "detail", "lifestyle", "other", "other"],
    sections: [quickPointSection("배터리")],
    expect: (assigned) => {
      const idx = imageIndexOf(assigned[0]);
      const ok = idx === 0;
      return {
        ok,
        detail: `assigned imageIndex=${idx} (expect hero@0)`,
      };
    },
  },
  {
    name: "quick_points 3개 — 선명 컷 우선, 매크로 detail 회피",
    category: "반려동물",
    imageCount: 8,
    roles: PET_MACRO_ROLES,
    sections: [
      quickPointSection("포인트1"),
      quickPointSection("포인트2"),
      quickPointSection("하루 1~2개"),
    ],
    expect: (assigned) => {
      const indexes = assigned.map(imageIndexOf);
      const first = indexes[0];
      const ok = first === 4;
      return {
        ok,
        detail: `assigned [${indexes.join(", ")}] (1st=${first}, expect package@4; later slots may fallback detail when pool exhausted)`,
      };
    },
  },
];

function main() {
  const results: { name: string; ok: boolean; detail: string }[] = [];
  let fail = 0;

  for (const scenario of scenarios) {
    const assigned = assignDistinctSectionImages(scenario.sections, scenario.imageCount, {
      category: scenario.category,
      imageRoles: scenario.roles,
    });
    const { ok, detail } = scenario.expect(assigned);
    results.push({ name: scenario.name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${scenario.name}`);
    console.log(`       ${detail}`);
    if (!ok) fail += 1;
  }

  const lines = [
    "# 54차 quick_points 이미지 배정 검증",
    "",
    `생성: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## 변경 요약",
    "",
    "- `quick_points`를 `detail_zoom`/`fabric_composition`과 분리",
    "- 우선순위: **package → hero → detail** (compact 96px 슬롯)",
    "",
    "## 시나리오 결과",
    "",
    "| 시나리오 | 결과 | 상세 |",
    "|----------|------|------|",
    ...results.map((r) => `| ${r.name} | ${r.ok ? "PASS" : "FAIL"} | ${r.detail} |`),
    "",
    `**합계:** ${results.length - fail}/${results.length} PASS`,
    "",
  ];

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
  console.log(`\n[54cha-qp] wrote ${REPORT}`);

  if (fail > 0) process.exit(1);
}

main();
