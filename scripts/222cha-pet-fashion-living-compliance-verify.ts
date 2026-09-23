/**
 * 222차 — pet/fashion/living compliance sanitize 검증 (API 0).
 *   npx tsx scripts/222cha-pet-fashion-living-compliance-verify.ts
 */
import {
  isPetCategory,
  reviewPetCopy,
  sanitizeText as sanitizePet,
} from "../lib/pet-compliance";
import {
  isFashionCategory,
  reviewFashionCopy,
  sanitizeText as sanitizeFashion,
} from "../lib/fashion-compliance";
import {
  isLivingCategory,
  reviewLivingCopy,
  sanitizeText as sanitizeLiving,
} from "../lib/living-compliance";
import {
  isElectronicsCategory,
  sanitizeText as sanitizeElectronics,
} from "../lib/electronics-compliance";
import { isCosmeticsCategory } from "../lib/cosmetics-compliance";
import { isFoodCategory } from "../lib/food-compliance";
import type { GeneratedCopy } from "../lib/types/generate";

const ALL_CATEGORIES = [
  "의류/패션",
  "화장품/뷰티",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
  "기타",
] as const;

type Case = { input: string; expect: string; label: string };

const PET_CASES: Case[] = [
  { input: "질병 예방 기능", expect: "건강 관리에 도움 기능", label: "질병 예방" },
  { input: "질병 치료 기능", expect: "컨디션 관리 지원 기능", label: "질병 치료/치료 효과" },
  { input: "치료 효과 입증", expect: "컨디션 관리 지원 입증", label: "질병 치료/치료 효과" },
  { input: "완치 가능", expect: "컨디션 개선 가능", label: "완치" },
  { input: "수의사 추천 사료", expect: "반려인들의 선택 사료", label: "수의사 추천/승인" },
  { input: "수의사 승인 제품", expect: "반려인들의 선택 제품", label: "수의사 추천/승인" },
  { input: "부작용 없음", expect: "안전 기준 준수", label: "부작용 없음" },
  { input: "100% 안전", expect: "높은 안전성", label: "100% 안전" },
  { input: "평생 건강 보장", expect: "건강 관리 지원", label: "평생 건강 보장" },
  { input: "모든 질환에 효과", expect: "다양한 상황에 도움", label: "모든 질환에 효과" },
  { input: "약효 성분", expect: "기능성 성분", label: "약효" },
  { input: "의약품 수준 케어", expect: "전문적인 관리 수준 케어", label: "의약품 수준" },
];

const FASHION_CASES: Case[] = [
  { input: "영구 변형 없음", expect: "우수한 형태 유지력", label: "영구 변형 없음" },
  { input: "완전 탈색 방지", expect: "우수한 색상 지속력", label: "완전 탈색 방지" },
  { input: "평생 보증", expect: "품질 보증 지원", label: "평생 보증" },
  { input: "평생 무료 수선", expect: "애프터서비스 지원", label: "평생 무료 수선" },
  { input: "절대 줄어들지 않음", expect: "수축 방지 가공", label: "절대 줄어들지 않음" },
  { input: "완벽한 핏", expect: "편안한 핏", label: "완벽한 핏" },
  { input: "완벽 핏", expect: "편안한 핏", label: "완벽한 핏" },
];

const LIVING_CASES: Case[] = [
  { input: "완전 무독성 제품", expect: "안전 기준을 준수한 소재 제품", label: "완전 무독성" },
  {
    input: "환경호르몬 전혀 없음",
    expect: "환경호르몬 안전 기준 준수",
    label: "환경호르몬 전혀 없음",
  },
  { input: "100% 항균", expect: "항균 처리", label: "100%/완벽 항균" },
  { input: "완벽 항균", expect: "항균 처리", label: "100%/완벽 항균" },
  { input: "평생 보장", expect: "품질 보증 지원", label: "평생 보장" },
  { input: "반영구 사용", expect: "장기간 사용", label: "반영구" },
  { input: "반영구적으로", expect: "장기간으로", label: "반영구" },
];

function runCases(
  name: string,
  cases: Case[],
  sanitize: (t: string) => { text: string; replacements: { original: string; count: number }[] },
): number {
  let failed = 0;
  console.log(`=== ${name} sanitize rules (${cases.length}) ===`);
  for (const c of cases) {
    const { text, replacements } = sanitize(c.input);
    const ok =
      text === c.expect &&
      replacements.some((r) => r.original === c.label && r.count >= 1);
    console.log(ok ? "OK" : "FAIL", c.label, JSON.stringify(c.input), "→", text);
    if (!ok) failed += 1;
  }
  return failed;
}

function main() {
  let failed = 0;

  failed += runCases("pet", PET_CASES, sanitizePet);
  failed += runCases("fashion", FASHION_CASES, sanitizeFashion);
  failed += runCases("living", LIVING_CASES, sanitizeLiving);

  console.log("=== nested: pet 치료 효과 / 질병 예방 ===");
  {
    const nested = sanitizePet("질병 예방과 치료 효과, 수의사 추천");
    const ok =
      nested.text === "건강 관리에 도움과 컨디션 관리 지원, 반려인들의 선택" &&
      !nested.text.includes("질병") &&
      !nested.text.includes("수의사");
    console.log(ok ? "OK" : "FAIL", nested.text, nested.replacements);
    if (!ok) failed += 1;
  }

  console.log("=== nested: fashion 평생 무료 수선 vs 평생 보증 ===");
  {
    const nested = sanitizeFashion("평생 무료 수선과 평생 보증");
    const ok =
      nested.text === "애프터서비스 지원과 품질 보증 지원" &&
      !nested.text.includes("평생") &&
      nested.replacements.some((r) => r.original === "평생 무료 수선") &&
      nested.replacements.some((r) => r.original === "평생 보증");
    console.log(ok ? "OK" : "FAIL", nested.text, nested.replacements);
    if (!ok) failed += 1;
  }

  console.log("=== nested: living 반영구적으로 (잘림 방지) ===");
  {
    const nested = sanitizeLiving("반영구적으로 쓰는 평생 보장 제품");
    const ok =
      !nested.text.includes("반장기간") &&
      nested.text.includes("장기간으로") &&
      nested.text.includes("품질 보증 지원");
    console.log(ok ? "OK" : "FAIL", nested.text, nested.replacements);
    if (!ok) failed += 1;
  }

  console.log("=== clean copy no over-replace ===");
  {
    const pet = sanitizePet("영양 균형 설계로 건강한 습관 형성에 도움");
    const fashion = sanitizeFashion("데일리로 입기 좋은 코튼 티셔츠");
    const living = sanitizeLiving("주방용 수납함으로 공간을 정리");
    const ok =
      pet.replacements.length === 0 &&
      fashion.replacements.length === 0 &&
      living.replacements.length === 0;
    console.log(ok ? "OK" : "FAIL", { pet, fashion, living });
    if (!ok) failed += 1;
  }

  console.log("=== review*Copy fixtures ===");
  {
    const petFix: GeneratedCopy = {
      headlines: ["질병 예방 사료"],
      description: "수의사 추천",
      features: ["부작용 없음"],
      howToUse: "정상 급여",
      caution: "약효 주의",
      sections: [
        {
          type: "hero",
          slot: "hero",
          headline: "의약품 수준 케어",
          subheadline: "완치",
          imageIndex: 0,
        },
      ],
    };
    const pet = reviewPetCopy(petFix);
    const petOk =
      pet.mfdsReviewed &&
      !pet.copy.headlines[0]!.includes("질병 예방") &&
      pet.copy.description === "반려인들의 선택";

    const fashionFix: GeneratedCopy = {
      headlines: ["완벽한 핏"],
      description: "평생 보증",
      features: ["영구 변형 없음"],
      howToUse: "세탁 안내",
      caution: "주의",
      sections: [],
    };
    const fashion = reviewFashionCopy(fashionFix);
    const fashionOk =
      fashion.mfdsReviewed && fashion.copy.headlines[0] === "편안한 핏";

    const livingFix: GeneratedCopy = {
      headlines: ["완전 무독성"],
      description: "반영구",
      features: ["100% 항균"],
      howToUse: "사용법",
      caution: "주의",
      sections: [],
    };
    const living = reviewLivingCopy(livingFix);
    const livingOk =
      living.mfdsReviewed &&
      living.copy.headlines[0] === "안전 기준을 준수한 소재" &&
      living.copy.description === "장기간";

    console.log(petOk ? "OK" : "FAIL", "pet review", pet.replacements.length);
    console.log(fashionOk ? "OK" : "FAIL", "fashion review", fashion.replacements.length);
    console.log(livingOk ? "OK" : "FAIL", "living review", living.replacements.length);
    if (!petOk || !fashionOk || !livingOk) failed += 1;
  }

  console.log("=== category gate (상호 배타 + 기존 3개 회귀) ===");
  for (const cat of ALL_CATEGORIES) {
    const flags = {
      cosmetics: isCosmeticsCategory(cat),
      food: isFoodCategory(cat),
      electronics: isElectronicsCategory(cat),
      pet: isPetCategory(cat),
      fashion: isFashionCategory(cat),
      living: isLivingCategory(cat),
    };
    const trueCount = Object.values(flags).filter(Boolean).length;
    const expectedOne =
      cat === "화장품/뷰티" ||
      cat === "식품/건강기능식품" ||
      cat === "전자제품" ||
      cat === "반려동물" ||
      cat === "의류/패션" ||
      cat === "생활용품";
    const ok = expectedOne ? trueCount === 1 : trueCount === 0;
    console.log(ok ? "OK" : "FAIL", cat, flags);
    if (!ok) failed += 1;
  }

  console.log("=== electronics 회귀 (기존 규칙 유지) ===");
  {
    const e = sanitizeElectronics("반영구적으로 사용 가능한 평생 보장 제품");
    const ok =
      !e.text.includes("반장기간") &&
      e.text.includes("장기간") &&
      e.text.includes("품질 보증 지원");
    console.log(ok ? "OK" : "FAIL", e.text);
    if (!ok) failed += 1;
  }

  console.log(failed === 0 ? "\nALL PASS" : `\nFAILED: ${failed}`);
  console.log("API generate: 0");
  if (failed > 0) process.exit(1);
}

main();
