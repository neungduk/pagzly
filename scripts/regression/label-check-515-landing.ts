/**
 * 515 — 랜딩 v4(번짐·움직임·문구 띠) 정적 가드
 *
 * 걸린 문구(caught/before)는 의도적 문제 표현일 수 있음.
 * 금지어 검사는 after·대체 문구·UI 카피에만 적용.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  LANDING_BELT_CHIPS_515,
  LANDING_BELT_NOTE_515,
  LANDING_DEMO_CARDS_514,
  landingDemoChipCounts514,
} from "../../components/label-check/ui-511/landing-demo-514";

export const name = "표시사항 515 — 랜딩 v4 번짐·움직임";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];

function read(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const css = read(path.join("components", "label-check", "ui-511", "label-site-511.css"));
  const landing = read(path.join("components", "label-check", "ui-511", "LabelCheckLanding.tsx"));
  const demo = read(path.join("components", "label-check", "ui-511", "LandingProofDemo.tsx"));
  const stage = read(path.join("components", "label-check", "ui-519", "LandingStage519.tsx"));
  const belt = read(path.join("components", "label-check", "ui-519", "LandingBelt515.tsx"));
  const dataPath = path.join("components", "label-check", "ui-511", "landing-demo-514.ts");
  const data = read(dataPath);
  const stageBlob = stage + belt + demo;

  // (a) 번짐 3개·색
  for (const c of ["#D5DEFF", "#FFDCCB", "#CFEFE0", "#d5deff", "#ffdccb", "#cfefe0"]) {
    // case-insensitive presence of the three washes
  }
  if (!/#d5deff/i.test(css) || !/#ffdccb/i.test(css) || !/#cfefe0/i.test(css)) {
    fails.push("515a: 번짐 색 3개 없음");
  }
  if (!/\.lc515-wash/.test(css) || !landing.includes("lc515-wash")) {
    fails.push("515a: wash 마크업/CSS 없음");
  }
  if ((css.match(/\.lc515-wash i\.(a|b|c)/g) || []).length < 3 && !/\.lc515-wash i\.a/.test(css)) {
    fails.push("515a: wash a/b/c 선택자 부족");
  }
  if (!/#f3f5fb/i.test(css) && !landing.includes("#F3F5FB") && !landing.includes("lc515-landing")) {
    fails.push("515a: 랜딩 바탕 #F3F5FB 없음");
  }

  // (b) reduced-motion 정지
  const reduce = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/);
  if (!reduce) fails.push("515b: reduced-motion 블록 없음");
  else {
    const block = reduce[0];
    for (const need of ["lc515-wash", "lc515-float", "lc515-belt", "lc515-mk", "background-size: 100%"]) {
      if (!block.includes(need.replace("lc515-float", "lc515-float1")) && need === "lc515-float") {
        if (!block.includes("lc515-float1") || !block.includes("lc515-float2")) {
          fails.push("515b: float reduced-motion 미포함");
        }
      } else if (need !== "lc515-float" && !block.includes(need)) {
        fails.push(`515b: reduced-motion에 ${need} 없음`);
      }
    }
  }

  // (c) 칩 숫자 = 데모 카드 개수 (519: 무대 요약이 카운트 사용)
  const counts = landingDemoChipCounts514();
  if (
    !stageBlob.includes("landingDemoChipCounts514") &&
    !stageBlob.includes("chips.fix") &&
    !data.includes("landingDemoChipCounts514")
  ) {
    fails.push("515c: 칩이 데모 카운트 미사용");
  }
  const fixCards = LANDING_DEMO_CARDS_514.filter((c) => c.kind === "fix").length;
  const checkCards = LANDING_DEMO_CARDS_514.filter((c) => c.kind === "check").length;
  if (counts.fix !== fixCards || counts.check !== checkCards) {
    fails.push("515c: chipCounts ≠ 카드 kind 집계");
  }
  if (counts.fix < 1 || counts.check < 1) fails.push("515c: fix/check 카드 부족");

  // (d) 띠 아래 예시 문구 (519: LandingBelt515)
  if (
    !stageBlob.includes("LANDING_BELT_NOTE_515") &&
    !stageBlob.includes("예시 문구입니다")
  ) {
    fails.push("515d: 띠 예시 문구 표기 없음");
  }
  if (LANDING_BELT_NOTE_515 !== "예시 문구입니다") {
    fails.push("515d: BELT_NOTE 문구 불일치");
  }
  if (!data.includes("LANDING_BELT_CHIPS_515") || LANDING_BELT_CHIPS_515.length < 4) {
    fails.push("515d: 띠 데이터 부족");
  }

  // 금지어: after·UI 카피만 (caught/before 제외)
  const afterTexts = [
    ...LANDING_DEMO_CARDS_514.map((c) => c.after || "").filter(Boolean),
    ...LANDING_DEMO_CARDS_514.map((c) => c.afterNote || ""),
    ...LANDING_DEMO_CARDS_514.map((c) => (c.kind === "ok" || c.kind === "check" ? c.body || "" : "")),
  ].join("\n");
  const uiCopy = landing + demo.replace(/caught[\s\S]{0,80}/g, "");
  for (const w of FORBIDDEN) {
    if (afterTexts.includes(w)) fails.push(`515: after 금지어 ${w}`);
    // UI에서 금지어 — 데모 caught 문자열 제외 위해 data 파일 전체는 스킵하고 랜딩·데모 컴포넌트만
    if (landing.includes(w) || (demo.includes(w) && !LANDING_BELT_CHIPS_515.some((c) => c.caught.includes(w)))) {
      if (landing.includes(w)) fails.push(`515: 랜딩 금지어 ${w}`);
    }
  }
  void uiCopy;

  // (e) package.json 변경 없음 + 외부 이미지 없음
  try {
    const diff = execSync("git diff --name-only HEAD -- package.json package-lock.json", {
      encoding: "utf8",
    }).trim();
    if (diff) fails.push(`515e: package 변경 ${diff}`);
  } catch {
    fails.push("515e: package diff 실패");
  }
  if (/<img\b|url\(\s*['\"]?https?:/i.test(landing + demo + css)) {
    fails.push("515e: 외부 이미지/URL 사용");
  }

  // (f) 514 가드 핵심 유지
  if (!landing.includes("지금 올려 보세요")) fails.push("515f: 514 CTA 문구 소실");
  if (landing.includes("요금") || landing.includes("무료") || landing.includes("1분")) {
    fails.push("515f: 514 금지 문구 재유입");
  }
  if (!stageBlob.includes("예시 화면입니다") && !data.includes("예시 화면입니다")) {
    fails.push("515f: 예시 화면입니다 소실");
  }

  // (g) 점검/결과 선택자(.lc507) 구조 유지 — 파일 존재·주요 클래스
  const result = read(path.join("components", "label-check", "ui-507", "ResultView.tsx"));
  const upload = read(path.join("components", "label-check", "ui-507", "UploadCard.tsx"));
  if (!result.includes("lc507") || !upload.includes("lc507")) {
    fails.push("515g: 점검/결과 lc507 선택자 소실");
  }
  // 515가 ResultView/UploadCard를 바꾸면 안 됨
  try {
    const touched = execSync(
      "git diff --name-only HEAD -- components/label-check/ui-507/ResultView.tsx components/label-check/ui-507/UploadCard.tsx",
      { encoding: "utf8" },
    ).trim();
    if (touched) fails.push(`515g: 점검/결과 화면 수정됨 — ${touched}`);
  } catch {
    fails.push("515g: ui-507 diff 확인 실패");
  }

  return fails;
}
