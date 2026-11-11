/**
 * 525 — 토스 시작 화면(인라인 설정·설명 구역) 가드
 */
import fs from "node:fs";
import path from "node:path";
import { labelRuleCounts514 } from "../../lib/label-check/rules-count-514";
import { NOTICE_IMAGE_PDF_497, NOTICE_PDF_AS_IMAGE_524 } from "../../lib/label-check/types";

export const name = "표시사항 525 — 토스 시작 화면 PC결";

const ROOT = process.cwd();
const FORBIDDEN = ["무료", "요금", "1분", "위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkTs(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      walkTs(p, out);
    } else if (/\.tsx?$/.test(ent.name)) out.push(p);
  }
  return out;
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  const checkStart = read("components/label-check/ui-517/CheckStart517.tsx");
  const toss = read("toss-app/src/CheckScreen.tsx");
  const explain = read("toss-app/src/ui/StartExplain525.tsx");
  const countsFile = read("toss-app/src/ui/rule-counts-525.ts");
  const copy = read("toss-app/src/copy.ts");

  if (!checkStart.includes("inlineSettings?: boolean")) {
    f.push("525: CheckStart517에 inlineSettings 선택 속성 없음");
  }
  if (!checkStart.includes("props.inlineSettings ? null")) {
    f.push("525: inlineSettings 시 aside 생략 분기 없음");
  }
  if (!toss.includes("inlineSettings")) f.push("525: CheckScreen에 inlineSettings 미전달");

  if (toss.includes("toss-settings-summary") || toss.includes("settingsOpen") || toss.includes("openSettings")) {
    f.push("525: 시작 화면 설정 시트/요약 행이 남아 있음");
  }
  if (!toss.includes("StartExplain525")) f.push("525: StartExplain525 미연결");

  {
    const live = labelRuleCounts514();
    if (!countsFile.includes(`kr: ${live.kr}`) || !countsFile.includes(`us: ${live.us}`)) {
      f.push(`525: RULE_COUNTS_525가 실측(${live.kr}/${live.us})과 다름`);
    }
    if (/kr_label_rules|us_label_rules|rules-count-514/.test(explain)) {
      f.push("525: 설명 부품이 규칙 JSON/count 모듈을 끌어오면 안 됨");
    }
  }

  for (const [label, src] of [
    ["copy.ts", copy],
    ["StartExplain525.tsx", explain],
    ["CheckScreen.tsx", toss],
  ] as const) {
    for (const w of FORBIDDEN) {
      if (src.includes(w)) f.push(`525: 금지어 "${w}" in ${label}`);
    }
  }
  if (/법령 변경을 매일|매일 확인/.test(explain + copy)) {
    f.push("525: 법령 매일 확인 주장 금지");
  }

  if (!NOTICE_IMAGE_PDF_497.includes("글자가 이미지로 들어 있어 읽지 못했습니다")) {
    f.push("525: NOTICE_IMAGE_PDF_497 변경");
  }
  if (!NOTICE_PDF_AS_IMAGE_524.includes("사진처럼 읽었어요")) {
    f.push("525: NOTICE_PDF_AS_IMAGE_524 변경");
  }
  if (!toss.includes("probePdfRoute524") || !toss.includes("NOTICE_PDF_AS_IMAGE_524")) {
    f.push("525: 524 PDF→OCR 경로가 CheckScreen에서 빠짐");
  }

  for (const p of walkTs(path.join(ROOT, "toss-app", "src"))) {
    const src = fs.readFileSync(p, "utf8");
    if (
      /from\s+["'][^"']*(LandingStage519|LandingBelt515|FixShowcase519|rules-count-514)/.test(src) ||
      /import\s*\{[^}]*labelRuleCounts514/.test(src)
    ) {
      f.push(`525: 무거운 PC 랜딩/JSON count를 토스에서 import (${path.relative(ROOT, p)})`);
    }
    if (/from ["']next\//.test(src)) f.push(`525: next/* import in ${path.relative(ROOT, p)}`);
  }

  if (!explain.includes("이렇게 점검해요")) f.push("525: 3단계 제목 없음");
  if (!explain.includes("이런 걸 찾아 줘요")) f.push("525: 미니 예시 제목 없음");
  if (!explain.includes("법적 판단이 아니")) f.push("525: 고지 문구 없음");
  if (!copy.includes("고칠 곳을 알려")) f.push("525: heroSub PC결 설명 없음");

  return f;
}
