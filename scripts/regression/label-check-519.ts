/**
 * 519 — 랜딩 첫 화면(제목 줄 + 무대) 정적 가드
 */
import fs from "node:fs";
import path from "node:path";

export const name = "표시사항 519 — 랜딩 첫 화면 재구성";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%", "무료", "요금", "1분"];

function read(rel: string): string {
  const p = path.join(process.cwd(), rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

/** before/caught 예시 문자열은 금지어 검사에서 제외 */
function stripCaughtExamples(src: string): string {
  return src
    .replace(/LANDING_DEMO_PHRASE_BAD_514[\s\S]*?;/g, "")
    .replace(/before:\s*["'][^"']*["']/g, "")
    .replace(/beforeEm:\s*["'][^"']*["']/g, "")
    .replace(/caught:\s*["'][^"']*["']/g, "");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const stage = read("components/label-check/ui-519/LandingStage519.tsx");
  const css = read("components/label-check/ui-519/landing-519.css");
  const belt = read("components/label-check/ui-519/LandingBelt515.tsx");
  const countUp = read("components/label-check/ui-519/CountUp514.tsx");
  const data = read("components/label-check/ui-511/landing-demo-514.ts");
  const landing = read("components/label-check/ui-511/LabelCheckLanding.tsx");

  if (!stage || !css) f.push("519: ui-519 LandingStage/CSS 없음");

  // 1) 금지어 (caught/before 제외). CSS 수치(width/keyframe/background-size)의 100%는 제외.
  const scan = stripCaughtExamples(stage + belt + countUp + landing + data);
  const cssCopy = css
    .replace(/width:\s*[^;{]+/g, "")
    .replace(/background-size:\s*[^;]+/g, "")
    .replace(/\b\d+%\s*\{/g, "{");
  for (const w of FORBIDDEN) {
    if (w === "100%") {
      if (/\b100%/.test(scan) || /\b100%/.test(cssCopy)) f.push(`519: 금지어 "${w}"`);
      continue;
    }
    if (scan.includes(w) || cssCopy.includes(w)) f.push(`519: 금지어 "${w}"`);
  }

  // 2) 제목 숫자 = labelRuleCounts514
  if (!stage.includes("labelRuleCounts514")) f.push("519: labelRuleCounts514 미사용");
  if (/\b\{?\s*35\s*\}?\b/.test(stage) && !stage.includes("labelRuleCounts514")) {
    f.push("519: 규칙 수 하드코딩 의심");
  }
  if (!stage.includes("CountUp514") && !countUp.includes("to")) {
    f.push("519: 숫자 카운트업 없음");
  }

  // 3) reduced-motion
  if (!/prefers-reduced-motion:\s*reduce/.test(css)) {
    f.push("519: prefers-reduced-motion 없음");
  }

  // 4) 법적 고지
  if (!stage.includes("법적 판단이 아닌") && !data.includes("법적 판단이 아닌")) {
    f.push("519: 법적 판단 고지 없음");
  }

  // 5) id=demo 한 곳
  const demoHits = [
    ...landing.matchAll(/id=["']demo["']/g),
    ...stage.matchAll(/id=["']demo["']/g),
    ...belt.matchAll(/id=["']demo["']/g),
  ];
  if (demoHits.length !== 1) f.push(`519: id=demo 개수 ${demoHits.length}`);

  // 구도 연결
  if (!landing.includes("LandingStage519")) f.push("519: 랜딩에 Stage 미연결");
  if (!landing.includes("LandingBelt515")) f.push("519: 랜딩에 Belt 미연결");
  if (landing.includes("lc514-hero")) f.push("519: 옛 lc514-hero 잔존");

  // 문구
  if (!stage.includes("내 라벨 점검해 보기")) f.push("519: 주 CTA 문구");
  if (!stage.includes("결과 예시 보기")) f.push("519: 보조 링크");

  return f;
}

if (require.main === module) {
  run().then((fails) => {
    if (fails.length) {
      console.error(fails.join("\n"));
      process.exit(1);
    }
    console.log("ok", name);
  });
}
