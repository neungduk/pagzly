/**
 * 164차 — 카피 가드 확장 검증: allCopyTextFields(feature/socialProofPlaceholder 추가) +
 * 신규 detectSentenceLengthMonotony(). $0, 합성 카피 데이터만 사용(API 호출 없음).
 */
import {
  detectGenericCliches,
  detectSentenceLengthMonotony,
} from "../lib/copy-orchestrator/validate-copy";
import type { DetailPageCopy } from "../lib/copy-orchestrator/types";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

function baseCopy(overrides: Partial<DetailPageCopy> = {}): DetailPageCopy {
  return {
    mainHeadline: "매일 아침 5분, 피부가 달라집니다",
    subHeadline: "저자극 성분으로 완성한 데일리 세럼",
    problemStatement: "건조하고 칙칙한 피부, 매일 아침 화장이 뜨는 게 스트레스였다면.",
    solutionStatement: "히알루론산 3종 복합 성분이 각질층까지 수분을 채워줍니다.",
    benefit: "사용 4주 후 피부 수분량이 눈에 띄게 늘어납니다.",
    feature: "세럼",
    featureDescription: "가볍게 흡수되는 저점도 텍스처로 끈적임 없이 마무리됩니다.",
    socialProofPlaceholder: "[리뷰 연동 영역]",
    faq: [{ question: "민감성 피부도 사용 가능한가요?", answer: "무향료·무알코올로 자극 테스트를 마쳤습니다." }],
    cta: "지금 확인하기",
    sections: [
      { type: "PROBLEM", title: "이런 고민 있으셨나요", body: "아침마다 당기는 피부, 화장이 뜨는 느낌." },
      { type: "SOLUTION", title: "성분으로 증명합니다", body: "히알루론산 3종이 수분 장벽을 채웁니다." },
    ],
    ...overrides,
  };
}

// 1) allCopyTextFields 확장 — feature 필드의 클리셰도 탐지되어야 함(163차엔 누락)
const clicheInFeature = baseCopy({ feature: "완벽한 선택 세럼" });
const hits1 = detectGenericCliches(clicheInFeature);
assert(
  hits1.some((h) => h.startsWith("feature:")),
  "164차: cliché inside `feature` field is now detected (was missing from 163차 field list)",
);

// 2) socialProofPlaceholder 필드도 커버(정상 플레이스홀더 문구는 클리셰 없어야 함 — 오탐 없음 확인)
const normalPlaceholder = baseCopy();
assert(
  detectGenericCliches(normalPlaceholder).length === 0,
  "normal socialProofPlaceholder text produces no false-positive cliché hit",
);
const clicheInPlaceholder = baseCopy({ socialProofPlaceholder: "지금 바로 만나보세요 [리뷰 연동 영역]" });
const hits2 = detectGenericCliches(clicheInPlaceholder);
assert(
  hits2.some((h) => h.startsWith("socialProofPlaceholder:")),
  "164차: cliché inside `socialProofPlaceholder` field is now detected",
);

// 3) 문장 길이 균일성(모노토니) — 전부 비슷한 길이의 문장이면 탐지되어야 함
const monotonousCopy = baseCopy({
  problemStatement: "매일 아침 피부가 당기고 화장이 뜬다면 이것을 확인해보세요.",
  solutionStatement: "히알루론산 성분이 각질층까지 수분을 채워주는 세럼입니다.",
  benefit: "사용 후 4주가 지나면 피부 수분량이 눈에 띄게 늘어납니다.",
  featureDescription: "가볍게 흡수되는 텍스처로 끈적임 없이 산뜻하게 마무리됩니다.",
  sections: [
    { type: "PROBLEM", title: "고민", body: "건조한 피부는 매일 아침 스트레스를 유발합니다." },
    { type: "SOLUTION", title: "해결", body: "수분 성분이 하루 종일 촉촉함을 유지시켜 줍니다." },
  ],
  faq: [{ question: "궁금해요", answer: "민감성 피부도 자극 없이 사용할 수 있습니다." }],
});
const monotonyHits = detectSentenceLengthMonotony(monotonousCopy);
assert(
  monotonyHits.length === 1,
  `uniform sentence lengths trigger monotony detection (got ${monotonyHits.length} hits: ${monotonyHits.join(" | ")})`,
);

// 4) 문장 길이가 다양하면(들쭉날쭉) 탐지되지 않아야 함 — 오탐 없음
const variedCopy = baseCopy({
  problemStatement: "그게 문제였어요. 매일 아침 피부가 당기고 화장이 뜨는 느낌, 도대체 왜 이러는 건지 몰라서 답답했던 적 있으신가요?",
  solutionStatement: "답은 수분입니다. 히알루론산 3종이 각질층 깊숙한 곳까지 파고들어 수분 장벽을 촘촘하게 채워줍니다.",
  benefit: "4주 후, 확실히 달라집니다. 거울을 볼 때마다 스스로도 놀랄 만큼 피부결이 매끄러워지고 수분량이 늘어난 걸 체감하게 됩니다.",
  featureDescription: "가볍습니다. 발림성이 좋아서 아침에 바빠도 부담 없이, 끈적임 걱정 없이 바로 화장을 이어갈 수 있는 저점도 텍스처입니다.",
  sections: [
    { type: "PROBLEM", title: "고민", body: "건조함, 그 자체가 스트레스죠. 아침마다 반복되는 이 느낌을 없애고 싶었습니다." },
    { type: "SOLUTION", title: "해결", body: "간단합니다. 수분 성분 하나로 하루 종일 촉촉함이 유지되고, 화장도 더 잘 붙습니다." },
  ],
  faq: [{ question: "궁금해요", answer: "네, 가능합니다. 무향료·무알코올 처방으로 민감성 피부 자극 테스트까지 마쳤어요." }],
});
const variedHits = detectSentenceLengthMonotony(variedCopy);
assert(
  variedHits.length === 0,
  `varied (short+long mixed) sentence lengths do NOT trigger false positive (got ${variedHits.length} hits: ${variedHits.join(" | ")})`,
);

// 5) 표본 부족(문장이 거의 없는 짧은 카피) -> 판단 보류, 오탐 없음
const shortCopy = baseCopy({
  problemStatement: "간단합니다.",
  solutionStatement: "이걸로 끝.",
  benefit: "",
  featureDescription: "",
  sections: [],
  faq: [],
});
assert(
  detectSentenceLengthMonotony(shortCopy).length === 0,
  "insufficient sentence sample defers judgment (no false positive on very short copy)",
);

// 6) 헤드라인/CTA 같은 원래 짧은 필드는 모노토니 판단에서 제외되어야 함
// (헤드라인이 항상 짧은 건 정상이므로, 헤드라인만으로 "문장이 다 비슷하게 짧다"고 오판하면 안 됨)
const headlineOnlyVariation = baseCopy({
  mainHeadline: "5분",
  subHeadline: "세럼",
  cta: "확인",
  problemStatement: "그게 문제였어요. 매일 아침 피부가 당기고 화장이 뜨는 느낌, 왜 이러는 건지 몰라서 답답했던 적 있으신가요?",
  solutionStatement: "답은 수분입니다. 히알루론산 3종이 각질층 깊숙한 곳까지 파고들어 수분 장벽을 촘촘하게 채워줍니다.",
});
const headlineHits = detectSentenceLengthMonotony(headlineOnlyVariation);
// 헤드라인들이 극단적으로 짧아도, 본문(problemStatement/solutionStatement)만으로 판단하므로
// 이 케이스는 표본 부족(6문장 미만)으로 보류되어야 함 — 헤드라인이 섞여 왜곡되면 안 됨.
assert(
  headlineHits.length === 0,
  "short headline/CTA fields are excluded from monotony sampling (judged on body fields only)",
);

if (process.exitCode === 1) {
  console.error("\n164차 copy-guard verification FAILED");
  process.exit(1);
} else {
  console.log("\n164차 copy-guard verification PASSED (all assertions ok)");
}
