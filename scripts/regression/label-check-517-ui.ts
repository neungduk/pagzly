/**
 * 517 — 점검 시작·결과 v5 UI 정적 가드 + 핀 매칭 단위 테스트
 */
import fs from "node:fs";
import path from "node:path";
import {
  collectPins517,
  findFirstPin517,
  normalizeWs517,
} from "../../components/label-check/ui-517/pin-match-517";

export const name = "표시사항 517 — 점검·결과 v5 UI";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];
const BANNED_COPY = ["무료", "요금", "1분"];

function read(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const check = read("components/label-check/ui-517/CheckStart517.tsx");
  const result = read("components/label-check/ui-517/ResultView517.tsx");
  const source = read("components/label-check/ui-517/LabelSourcePanel517.tsx");
  const css = read("components/label-check/ui-517/label-check-517.css");
  const pin = read("components/label-check/ui-517/pin-match-517.ts");
  const landing = read("components/label-check/ui-511/LandingProofDemo.tsx");
  const page = read("app/label-check/page.tsx");
  const cta = read("lib/label-check/ui-status-507.ts");

  // (a) 금지 패턴
  for (const [label, blob] of [
    ["CheckStart", check],
    ["ResultView517", result],
  ] as const) {
    if (blob.includes("<details") || blob.includes("<details>")) {
      fails.push(`517a: ${label}에 details 사용`);
    }
    if (/type=["']radio["']/.test(blob)) {
      fails.push(`517a: ${label}에 type=radio`);
    }
    if (BANNED_COPY.some((w) => blob.includes(w))) {
      fails.push(`517a: ${label}에 요금/무료/1분`);
    }
    if (/border-left|borderLeft/.test(blob) && /강조|accent|bar/.test(blob)) {
      fails.push(`517a: ${label} border-left 강조 의심`);
    }
  }
  if (check.includes("lc507-steps") || /1 올리기/.test(check)) {
    fails.push("517a: 단계 알약 남음");
  }
  if (check.includes("또는") && check.includes("점선")) {
    fails.push("517a: 점선+또는 패턴");
  }

  // (b) 버튼 상태 문구 2종
  if (!check.includes("파일을 올리면 시작할 수 있어요")) {
    fails.push("517b: disabled 문구 없음");
  }
  if (!check.includes("점검하기") && !cta.includes('CTA_LABEL_507 = "점검하기"')) {
    fails.push("517b: 점검하기 CTA 없음");
  }
  if (cta.includes("무료로 점검하기")) {
    fails.push("517b: 옛 무료 CTA 잔존");
  }

  // (c) 핀 매칭
  {
    const src = "피부 주름을 완전히 없애 주는 앰플.\n비타민C";
    const hit = findFirstPin517(src, "완전히 없애 주는");
    if (!hit) fails.push("517c: 일치 핀 없음");
    const ws = findFirstPin517("주름을   완전히\n없애 주는 앰플", "완전히 없애 주는");
    if (!ws) fails.push("517c: 공백 정규화 실패");
    if (findFirstPin517(src, "존재하지않는문구XYZ")) {
      fails.push("517c: 미일치인데 핀 생김");
    }
    const dup = "AAA BBB AAA";
    const first = findFirstPin517(dup, "AAA");
    if (!first || first.start !== 0) fails.push("517c: 중복 시 첫 일치 아님");
    if (normalizeWs517("a \n\t b") !== "a b") fails.push("517c: normalizeWs 실패");
    const pins = collectPins517(src, [
      { id: "1", no: 1, needle: "완전히 없애 주는", color: "#f00" },
      { id: "2", no: 2, needle: "없음", color: "#0f0" },
    ]);
    if (pins.length !== 1) fails.push("517c: collectPins 미일치 포함");
  }

  // (d) 원문 없는 저장 결과 — 패널 미표시
  if (!result.includes("sourceText") || !/!sourceText|sourceText\s*\?|solo/.test(result)) {
    fails.push("517d: sourceText 없으면 패널 숨김 분기 없음");
  }
  const hist = read("app/label-check/history/[id]/page.tsx");
  if (/sourceText=\{/.test(hist) && !/sourceText=\{null\}/.test(hist)) {
    // history should not pass real sourceText
    if (/sourceText=\{[^n]/.test(hist)) fails.push("517d: history에 sourceText 전달");
  }

  // (e) 한 번에 하나만 펼침
  if (!/setOpenId|openId/.test(result)) {
    fails.push("517e: openId 단일 펼침 상태 없음");
  }

  // (f) 512/513/516 유지
  if (!result.includes("FindingCardBody512")) {
    fails.push("517f: FindingCardBody512 미사용");
  }
  if (!result.includes("skippedItems513") || !result.includes("referenceNotes513")) {
    fails.push("517f: 513 구역 없음");
  }
  if (!result.includes("useLawBaseline516") && !result.includes("lawBaseline")) {
    fails.push("517f: 516 기준일 없음");
  }
  if (!result.includes("법적 판단이 아닙니다")) {
    fails.push("517f: 고지 문구 없음");
  }

  // (g) reduced-motion
  if (!css.includes("prefers-reduced-motion")) {
    fails.push("517g: reduced-motion 규칙 없음");
  }

  // (h) dangerouslySetInnerHTML
  if (result.includes("dangerouslySetInnerHTML") || source.includes("dangerouslySetInnerHTML")) {
    fails.push("517h: dangerouslySetInnerHTML 사용");
  }

  // (i) 금지어 (CSS width 100% 제외 — tsx/ts만)
  for (const f of [check, result, source, landing, pin]) {
    for (const w of FORBIDDEN) {
      if (w === "100%") continue;
      if (f.includes(w)) fails.push(`517i: 금지어 ${w}`);
    }
  }
  for (const w of BANNED_COPY) {
    if (page.includes(w) || landing.includes(w)) fails.push(`517i: 페이지/랜딩 ${w}`);
  }

  // 연결·구 파일 유지
  if (!page.includes("CheckStart517") || !page.includes("ResultView517")) {
    fails.push("517: page가 517 컴포넌트 미연결");
  }
  if (!fs.existsSync("components/label-check/ui-507/UploadCard.tsx")) {
    fails.push("517: UploadCard 삭제됨");
  }
  if (!fs.existsSync("components/label-check/ui-507/ResultView.tsx")) {
    fails.push("517: ResultView 삭제됨");
  }
  if (!landing.includes("lc517-land-hero") && !landing.includes("BEFORE")) {
    fails.push("517: 랜딩 결과 열 v4b 미반영");
  }
  if (!css.includes("lc517-wash")) fails.push("517: wash 클래스 없음");

  return fails;
}
