/**
 * 163차 — 카피 클리셰/AI-tell 탐지 확장 검증. $0, API 호출 없음(합성 카피 데이터만 사용).
 */
import {
  detectGenericCliches,
  detectAiTellOveruse,
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
    problemStatement: "건조하고 칙칙한 피부, 매일 아침 화장이 뜨는 게 스트레스였다면",
    solutionStatement: "히알루론산 3종 복합 성분이 각질층까지 수분을 채워줍니다",
    benefit: "사용 4주 후 피부 수분량이 눈에 띄게 늘어납니다",
    feature: "세럼",
    featureDescription: "가볍게 흡수되는 저점도 텍스처로 끈적임 없이 마무리됩니다",
    socialProofPlaceholder: "",
    faq: [{ question: "민감성 피부도 사용 가능한가요?", answer: "무향료·무알코올로 자극 테스트를 마쳤습니다." }],
    cta: "지금 확인하기",
    sections: [
      { type: "PROBLEM", title: "이런 고민 있으셨나요", body: "아침마다 당기는 피부, 화장이 뜨는 느낌." },
      { type: "SOLUTION", title: "성분으로 증명합니다", body: "히알루론산 3종이 수분 장벽을 채웁니다." },
    ],
    ...overrides,
  };
}

// 1) 클리셰 없는 정상 카피 — hits 0
const clean = baseCopy();
assert(detectGenericCliches(clean).length === 0, "clean copy has zero generic-cliché hits");
assert(detectAiTellOveruse(clean).length === 0, "clean copy has zero AI-tell overuse hits");

// 2) 헤드라인/CTA 클리셰 — 기존 동작 유지 확인
const clicheHeadline = baseCopy({ mainHeadline: "이제 고민은 그만, 당신을 위한 선택" });
const hits2 = detectGenericCliches(clicheHeadline);
assert(hits2.length >= 1, "cliché in mainHeadline is still detected (regression check)");
assert(hits2.some((h) => h.startsWith("mainHeadline:")), "cliché hit is labeled with the mainHeadline field");

// 3) 163차 확장 — 본문(sections[].body)의 클리셰도 탐지되어야 함 (기존엔 안 됐음)
const clicheInBody = baseCopy({
  sections: [
    { type: "PROBLEM", title: "고민", body: "이제 고민은 그만! 완벽한 선택이 여기 있습니다." },
    { type: "SOLUTION", title: "해결", body: "히알루론산 3종이 수분 장벽을 채웁니다." },
  ],
});
const hits3 = detectGenericCliches(clicheInBody);
assert(hits3.length >= 1, "163차 fix: cliché inside sections[].body is now detected (was previously missed)");
assert(hits3.some((h) => h.includes("sections[0].body")), "cliché hit is labeled with the sections[0].body field");

// 4) 163차 확장 — faq[].answer의 클리셰도 탐지
const clicheInFaq = baseCopy({
  faq: [{ question: "궁금해요", answer: "지금 바로 만나보세요, 당신의 피부를 위한 선택입니다." }],
});
const hits4 = detectGenericCliches(clicheInFaq);
assert(hits4.some((h) => h.includes("faq[0].answer")), "cliché inside faq[0].answer is detected");

// 5) AI-tell 접속어 남용 — 여러 필드에 반복되면 감지
const connectiveOveruse = baseCopy({
  problemStatement: "또한 피부가 건조해지는 것은 흔한 고민입니다.",
  solutionStatement: "또한 히알루론산이 수분을 채워줍니다.",
  benefit: "또한 4주 후 확연한 차이를 느낄 수 있습니다.",
  featureDescription: "또한 가볍게 흡수되는 텍스처입니다.",
});
const aiHits5 = detectAiTellOveruse(connectiveOveruse);
assert(
  aiHits5.some((h) => h.includes('"또한"') && h.includes("connective overuse")),
  "connective adverb repeated 4x across fields triggers overuse detection",
);

// 6) AI-tell 문장 서두 반복 패턴 — 섹션이 같은 접속어로 시작하면 감지
const sentenceStartPattern = baseCopy({
  sections: [
    { type: "PROBLEM", title: "고민", body: "이러한 문제는 누구나 겪습니다." },
    { type: "SOLUTION", title: "해결", body: "이러한 성분 조합이 해답입니다." },
  ],
});
const aiHits6 = detectAiTellOveruse(sentenceStartPattern);
assert(
  aiHits6.some((h) => h.includes("sentence-start pattern") && h.includes("이러한")),
  "repeated section-opening connective ('이러한') across 2+ sections triggers pattern detection",
);

// 7) 단발성 접속어 사용(1회)은 오탐 없어야 함
const singleUse = baseCopy({
  problemStatement: "이처럼 건조한 피부는 관리가 필요합니다.",
});
const aiHits7 = detectAiTellOveruse(singleUse);
assert(aiHits7.length === 0, "a single occurrence of a connective/filler word does not trigger false positive");

// 8) 필러 단어 남용 — 6회 이상 반복 시 감지
const fillerOveruse = baseCopy({
  problemStatement: "다양한 고민을 가진 분들, 다양한 피부 타입, 다양한 환경에서도",
  solutionStatement: "다양한 성분을 다양한 비율로 배합, 다양한 테스트를 거쳤습니다.",
});
const aiHits8 = detectAiTellOveruse(fillerOveruse);
assert(
  aiHits8.some((h) => h.includes('"다양한"') && h.includes("filler word overuse")),
  "filler word repeated 6x+ triggers filler-word overuse detection",
);

if (process.exitCode === 1) {
  console.error("\n163차 copy-guard verification FAILED");
  process.exit(1);
} else {
  console.log("\n163차 copy-guard verification PASSED (all assertions ok)");
}
