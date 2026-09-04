/**
 * 116차 — 클리셰 감지 + 프롬프트 dry-run
 * 실행: npx tsx scripts/116cha-copy-tone-smoke.ts
 */
import assert from "node:assert/strict";
import { detectGenericCliches } from "../lib/copy-orchestrator/validate-copy";
import { buildDeepSeekPrompt, buildStyleRubricBlock } from "../lib/copy-orchestrator/deepseek-copy";
import { buildStructureSystemPrompt } from "../lib/copy-orchestrator/claude-structure";
import type { CopyProductInput, DetailPageCopy, PageStructurePlan } from "../lib/copy-orchestrator/types";

function minimalCopy(partial: Partial<DetailPageCopy>): DetailPageCopy {
  return {
    mainHeadline: "",
    subHeadline: "",
    problemStatement: "p",
    solutionStatement: "s",
    benefit: "b",
    feature: "f",
    featureDescription: "fd",
    socialProofPlaceholder: "[고객 후기 영역 — 실제 후기 연동 예정]",
    faq: [
      { question: "q1", answer: "a1" },
      { question: "q2", answer: "a2" },
    ],
    cta: "",
    sections: [{ type: "HERO", title: "t", body: "b" }],
    headline: "",
    ...partial,
  };
}

function run() {
  // --- cliché detect ---
  const dirty = detectGenericCliches(
    minimalCopy({
      mainHeadline: "이제 고민은 그만, 완벽한 선택",
      subHeadline: "새로운 시작이 여기 있습니다",
      cta: "지금 바로 만나보세요",
    }),
  );
  assert.ok(dirty.length >= 2, `expected ≥2 clichés, got ${dirty.length}: ${dirty.join(",")}`);

  const clean = detectGenericCliches(
    minimalCopy({
      mainHeadline: "산뜻한 미스트, 한 번의 분사",
      subHeadline: "카멜리아가 남기는 가벼운 보습막",
      cta: "드림글로우 담아가기",
    }),
  );
  assert.equal(clean.length, 0, `unexpected: ${clean.join(",")}`);

  // --- prompt dry-run ---
  const product: CopyProductInput = {
    productName: "드림글로우 카멜리아 에센스 미스트",
    category: "화장품/뷰티",
    brandName: "glowiest",
    keyFeatures: "카멜리아, 가벼운 미스트",
    ingredients: "카멜리아 추출물",
    targetCustomer: "20~30대 여성",
    price: 32000,
  };
  const structurePrompt = buildStructureSystemPrompt(product);
  assert.match(structurePrompt, /스타일 앵커/);
  assert.match(structurePrompt, /copyTone/);
  assert.doesNotMatch(structurePrompt, /placeholder.?replace/i);

  const structure: PageStructurePlan = {
    productAnalysis: "미스트",
    targetCustomerAnalysis: "20대",
    usps: ["가벼움", "산뜻"],
    copyTone: "가볍다 / 산뜻하다 / 화장 위 분사",
    pageStructure: [
      { order: 1, type: "HERO", purpose: "히어로", copyDirection: "짧게" },
      { order: 2, type: "CTA", purpose: "cta", copyDirection: "행동" },
    ],
  };
  const ds = buildDeepSeekPrompt(product, structure);
  assert.match(ds, /문체 루브릭/);
  assert.match(ds, /이제 고민은 그만/);
  assert.match(ds, /25자/);
  assert.match(ds, /환각 금지/);
  // anti-hallucination block unchanged markers
  assert.match(ds, /입력에 없는 효능/);
  assert.match(buildStyleRubricBlock(), /문장 리듬/);

  console.log("116cha-copy-tone-smoke PASS");
}

run();
