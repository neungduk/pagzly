/**
 * 114차 — 카피-이미지 매칭 단위 + allocatePreferQueue 통합 스모크
 * 실행: npx tsx scripts/114cha-copy-match-smoke.ts
 */
import assert from "node:assert/strict";
import { scoreImageForCopy, sectionCopyText } from "../lib/copy-image-match";
import { allocatePreferQueue } from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";
import type { ProductImageRole } from "../lib/image-roles";

function run() {
  // --- scoreImageForCopy (a) texture wins over package ---
  const sectionText = "부드러운 텍스처와 발림성이 돋보이는 질감";
  const scoreA = scoreImageForCopy({
    sectionText,
    candidateTags: ["texture", "질감"],
  });
  const scoreB = scoreImageForCopy({
    sectionText,
    candidateTags: ["package", "박스"],
  });
  assert.ok(scoreA > scoreB, `expected A(${scoreA}) > B(${scoreB})`);

  // --- (b) empty tags → 0 ---
  assert.equal(
    scoreImageForCopy({ sectionText, candidateTags: [] }),
    0,
  );
  assert.equal(
    scoreImageForCopy({ sectionText: "", candidateTags: ["질감"] }),
    0,
  );

  // reason 보조 가점
  const withReason = scoreImageForCopy({
    sectionText: "클로즈업 디테일",
    candidateTags: [],
    candidateReason: "클로즈업 매크로 컷",
  });
  assert.ok(withReason > 0);

  assert.equal(
    sectionCopyText({ heading: "헤드", body: "본문" }),
    "헤드 본문",
  );

  // --- allocatePreferQueue: detail 경쟁 + tags 타이브레이커 ---
  const sections: DetailSection[] = [
    {
      type: "image_text",
      slot: "ingredient_highlight",
      heading: "핵심 성분",
      body: "히알루론산 성분이 촉촉하게",
      imageIndex: 0,
      imagePosition: "left",
    },
    {
      type: "image_text",
      slot: "texture_feel",
      heading: "텍스처",
      body: "부드러운 질감과 발림성",
      imageIndex: 0,
      imagePosition: "left",
    },
    {
      type: "image_text",
      slot: "detail_zoom",
      heading: "디테일",
      body: "클로즈업으로 본 표면",
      imageIndex: 0,
      imagePosition: "left",
    },
  ];
  const roles: ProductImageRole[] = ["detail", "detail", "detail", "hero"];
  const imageTags = [
    ["성분", "원료"],
    ["질감", "texture", "발림"],
    ["클로즈업", "매크로"],
    ["정면", "단독"],
  ];

  const alloc = allocatePreferQueue({
    sections,
    roles,
    imageCount: 4,
    imageTags,
  });

  // hero(role mismatch) index 3은 detail 풀에 없음 → 절대 선택 안 됨
  for (const v of alloc.values()) {
    if (typeof v === "number") assert.ok(v !== 3);
  }

  // texture_feel → tags 질감 이미지(1)
  assert.equal(alloc.get(1), 1);
  // ingredient_highlight → 성분(0) — DETAIL_SLOT_PRIORITY상 먼저지만 태그가 맞으면 0
  assert.equal(alloc.get(0), 0);
  // detail_zoom → 클로즈업(2)
  assert.equal(alloc.get(2), 2);

  // --- tags 전부 비면 기존 우선순위(남은 풀 앞에서부터) ---
  const fallback = allocatePreferQueue({
    sections,
    roles,
    imageCount: 4,
    imageTags: [[], [], [], []],
  });
  assert.equal(fallback.get(0), 0); // ingredient_highlight 먼저 → detail[0]
  assert.equal(fallback.get(1), 1);
  assert.equal(fallback.get(2), 2);

  console.log("114cha-copy-match-smoke PASS");
}

run();
