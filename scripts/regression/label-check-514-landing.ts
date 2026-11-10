/**
 * 514 — 랜딩 v3 정적 가드
 */
import fs from "node:fs";
import path from "node:path";
import { labelRuleCounts514 } from "../../lib/label-check/rules-count-514";
import {
  LANDING_BEFORE_AFTER_514,
  LANDING_DEMO_CARDS_514,
  LANDING_DEMO_DISCLAIMER_514,
} from "../../components/label-check/ui-511/landing-demo-514";

export const name = "표시사항 514 — 랜딩 v3 디자인";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];
const BANNED_COPY = ["요금", "무료", "1분"];
const CORAL = /#ff6b52/i;
const TEAL = /#0f3d36/i;

function read(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function relLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const rgb = [0, 1, 2].map((i) => {
    const v = parseInt(n.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
}

function contrast(a: string, b: string): number {
  const L1 = relLuminance(a);
  const L2 = relLuminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

const ALLOWED_RADIUS = new Set([3, 10, 14, 16, 20, 28, 999]); // 3=mark highlight

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  const landing = read(path.join("components", "label-check", "ui-511", "LabelCheckLanding.tsx"));
  const header = read(path.join("components", "label-check", "ui-511", "LabelHeader.tsx"));
  const demo = read(path.join("components", "label-check", "ui-511", "LandingProofDemo.tsx"));
  const demoData = read(path.join("components", "label-check", "ui-511", "landing-demo-514.ts"));
  const footer = read(path.join("components", "label-check", "ui-511", "LabelFooter.tsx"));
  const css = read(path.join("components", "label-check", "ui-511", "label-site-511.css"));
  // UI 카피(+ after 대체 문구). 데모 before/caught는 515에서 걸린 문구 예시로 제외.
  const uiBlob = landing + header + demo + footer;
  const afterBlob = [
    LANDING_BEFORE_AFTER_514.after,
    LANDING_BEFORE_AFTER_514.note,
    LANDING_DEMO_DISCLAIMER_514,
    ...LANDING_DEMO_CARDS_514.map((c) => [c.after, c.afterNote, c.body].filter(Boolean).join(" ")),
  ].join("\n");
  for (const w of FORBIDDEN) {
    if (uiBlob.includes(w) || afterBlob.includes(w)) fails.push(`514: 금지어 ${w}`);
  }
  for (const w of BANNED_COPY) {
    if (uiBlob.includes(w)) fails.push(`514: 금지 문구 ${w}`);
  }
  if (!demo.includes("예시 화면입니다") && !landing.includes("예시 화면입니다")) {
    fails.push("514: '예시 화면입니다' 없음");
  }
  if (!/labelRuleCounts514|counts\.kr/.test(landing)) {
    fails.push("514: 규칙 개수 JSON 연동 없음");
  }
  const counts = labelRuleCounts514();
  if (counts.kr < 1 || counts.us < 1) fails.push("514: 규칙 개수 읽기 실패");
  // 하드코딩 35/13이 랜딩에 직접 있으면 안 됨(counts 변수만)
  if (/\b35\b/.test(landing) || /\b13\b/.test(landing)) {
    fails.push("514: 랜딩에 규칙 개수 하드코딩");
  }

  // 토큰 대비
  const pairs: Array<[string, string, number]> = [
    ["#111214", "#F7F7F5", 4.5],
    ["#4A4D54", "#F7F7F5", 4.5],
    ["#5F6269", "#F7F7F5", 4.5],
    ["#1D4ED8", "#FFFFFF", 3], // 큰 강조
    ["#FFFFFF", "#1D4ED8", 4.5],
    ["#B4B7BE", "#111214", 4.5],
    ["#D6402B", "#FFFFFF", 3],
    ["#1F7A56", "#FFFFFF", 3],
  ];
  for (const [fg, bg, min] of pairs) {
    const r = contrast(fg, bg);
    if (r + 0.01 < min) fails.push(`514: 대비 ${fg}/${bg} = ${r.toFixed(2)} < ${min}`);
  }

  // 코랄·진초록 부재 (ui-511 css + 랜딩·헤더·데모·오버레이)
  const colorScan = [
    css,
    landing,
    header,
    demo,
    read(path.join("components", "label-check", "ui-511", "CheckBusyOverlay.tsx")),
    read(path.join("components", "label-check", "ui-507", "ResultView.tsx")),
    read(path.join("components", "label-check", "ui-507", "UploadCard.tsx")),
  ].join("\n");
  if (CORAL.test(colorScan)) fails.push("514: 코랄 #FF6B52 잔존");
  if (TEAL.test(colorScan)) fails.push("514: 진초록 #0F3D36 잔존");

  // 둥글기: css의 border-radius 숫자 (허용 외)
  const radii = [...css.matchAll(/border-radius:\s*(\d+)px/gi)].map((m) => Number(m[1]));
  for (const r of radii) {
    if (!ALLOWED_RADIUS.has(r)) fails.push(`514: 허용 외 둥글기 ${r}px`);
  }

  // 가로 스크롤 위험: 고정 width / 100vw in landing css scope
  if (/width:\s*\d{4,}px/.test(css) && /lc514/.test(css)) {
    // large fixed widths in lc514 blocks
  }
  if (/100vw/.test(css)) fails.push("514: 100vw 사용(가로 스크롤 위험)");

  // prefers-reduced-motion에 scan/rise
  if (!/lc-scan514/.test(css) || !/prefers-reduced-motion[\s\S]*lc-scan514/.test(css)) {
    fails.push("514: scan reduced-motion 미대응");
  }

  // 점검 경로
  if (!landing.includes('href="/label-check"') && !landing.includes("href={'/label-check'}")) {
    fails.push("514: /label-check 점검 경로 없음");
  }
  if (landing.includes("/label-check/check")) {
    fails.push("514: 존재하지 않는 /label-check/check 경로");
  }

  // CTA 문구
  if (!landing.includes("지금 올려 보세요")) fails.push("514: 마무리 CTA 문구");
  if (landing.includes("1분이면")) fails.push("514: 1분 소요 문구");

  // 폰트: Pretendard 미도입 시 Noto 유지 허용(보고서)
  if (!css.includes("--font-noto-sans-kr") && !css.includes("Pretendard")) {
    fails.push("514: 본문 글꼴 토큰 없음");
  }

  return fails;
}
