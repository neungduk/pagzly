/**
 * 522 — 토스 미니앱 = 웹 517 화면 재사용 가드
 */
import fs from "node:fs";
import path from "node:path";

export const name = "표시사항 522 — 토스=웹 517 재사용";

const ROOT = process.cwd();
const FORBIDDEN = ["무료", "요금", "1분", "위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkSrc(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === "public") continue;
      walkSrc(p, out);
    } else if (/\.(tsx?|jsx?|css)$/.test(ent.name)) out.push(p);
  }
  return out;
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const tossSrcDir = path.join(ROOT, "toss-app", "src");
  const files = walkSrc(tossSrcDir);
  const blob = files.map((p) => fs.readFileSync(p, "utf8")).join("\n");
  const tsBlob = files
    .filter((p) => /\.tsx?$/.test(p))
    .map((p) => fs.readFileSync(p, "utf8"))
    .join("\n");

  // 1) 517 컴포넌트 재사용, CheckFlow/SimpleResult 없음
  for (const name of ["CheckStart517", "OcrReview517", "ResultView517", "CheckBusyOverlay517"]) {
    if (!tsBlob.includes(name)) f.push(`522: ${name} import/사용 없음`);
  }
  if (tsBlob.includes("SimpleResult") || tsBlob.includes("CheckFlow")) {
    f.push("522: SimpleResult/CheckFlow 잔존");
  }
  if (fs.existsSync(path.join(tossSrcDir, "check", "CheckFlow.tsx"))) {
    f.push("522: CheckFlow.tsx 파일 잔존");
  }
  if (fs.existsSync(path.join(tossSrcDir, "check", "SimpleResult.tsx"))) {
    f.push("522: SimpleResult.tsx 파일 잔존");
  }

  // 2) CSS import
  if (!blob.includes("label-check-507.css") || !blob.includes("label-check-517.css")) {
    f.push("522: label-check-507/517.css import 없음");
  }

  // 3) base.css
  {
    const base = read("toss-app/src/base.css");
    if (!base.includes(".sr-only")) f.push("522: base.css .sr-only 없음");
    if (!/button\s*\{[^}]*background:\s*transparent/s.test(base)) {
      f.push("522: base.css button 배경 투명 초기화 없음");
    }
  }

  // 4) 기본값 보장 — touch/embedded 분기
  {
    const start = read("components/label-check/ui-517/CheckStart517.tsx");
    if (!start.includes("라벨 PDF나 사진을 여기에 놓으세요")) f.push("522: 웹 드롭 문구 소실");
    if (!start.includes("눌러서 파일 고르기")) f.push("522: 웹 고르기 문구 소실");
    if (!start.includes("준비 완료 · 오른쪽에서 점검하기를 누르세요")) {
      f.push("522: 웹 준비완료 문구 소실");
    }
    if (!start.includes("props.touch")) f.push("522: touch 분기 없음");
    const touchBlock = start.includes("props.touch") && start.includes("라벨 사진이나 PDF를 골라 주세요");
    if (!touchBlock) f.push("522: touch 전용 문구 없음");
    // 새 문구가 touch 없이 단독 기본으로 쓰이면 안 됨 — 기본 문자열은 웹 문구여야
    const result = read("components/label-check/ui-517/ResultView517.tsx");
    if (!result.includes("가입하면 결과를 다시 볼 수 있어요")) f.push("522: 가입 문구 소실");
    if (!result.includes("인쇄/PDF로 저장")) f.push("522: 인쇄 문구 소실");
    if (!result.includes("embedded")) f.push("522: embedded prop 없음");
  }

  // 5) toss-app이 embedded·touch 전달, isMember true / save: true 금지
  {
    if (!tsBlob.includes("embedded") || !/\btouch\b/.test(tsBlob)) {
      f.push("522: toss-app이 embedded/touch 미전달");
    }
    if (/isMember=\{true\}/.test(tsBlob) || /isMember:\s*true/.test(tsBlob)) {
      f.push("522: isMember true");
    }
    if (/save:\s*true/.test(tsBlob)) f.push("522: save: true");
  }

  // 6) 외부 이동·금지어 (toss-app/src 만)
  {
    if (/href=["']http/.test(tsBlob)) f.push("522: href=http");
    if (/window\.open/.test(tsBlob)) f.push("522: window.open");
    if (/location\.href\s*=/.test(tsBlob)) f.push("522: location.href =");
    if (/window\.print/.test(tsBlob)) f.push("522: window.print");
    for (const file of files.filter((p) => /\.tsx?$/.test(p))) {
      const src = fs.readFileSync(file, "utf8");
      const rel = path.relative(ROOT, file);
      for (const w of FORBIDDEN) {
        if (src.includes(w)) f.push(`522: 금지어 "${w}" in ${rel}`);
      }
    }
  }

  // 7) history + config
  {
    if (!tsBlob.includes("history.pushState") || !tsBlob.includes("popstate")) {
      f.push("522: pushState/popstate 없음");
    }
    const cfg = read("toss-app/src/config.ts");
    if (!cfg.includes("TOSS_ACCEPT") || !cfg.includes("TOSS_SHOW_US_MARKET")) {
      f.push("522: config 상수 없음");
    }
  }

  // 8) toss-overrides 범위
  {
    const ov = read("toss-app/src/toss-overrides.css");
    const rules = ov.replace(/\/\*[\s\S]*?\*\//g, "");
    // 최상위 선택자가 .toss-app 이 아닌 규칙(빈 줄·@media 제외) 검사 — 단순화: ".toss-app" 필수 키워드 + 16px + reduced-motion + hover: none
    if (!ov.includes(".toss-app")) f.push("522: overrides에 .toss-app 없음");
    if (!/font-size:\s*16px/.test(ov)) f.push("522: 입력 16px 규칙 없음");
    if (!ov.includes("prefers-reduced-motion")) f.push("522: prefers-reduced-motion 없음");
    if (!ov.includes("hover: none") && !ov.includes("(hover: none)")) {
      f.push("522: hover:none 처리 없음");
    }
    // 줄 단위: 최상위 선택자가 .toss-app / @media / @keyframes 가 아니면 실패
    for (const line of rules.split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("@") || t.startsWith("}") || t.startsWith("*") || !t.includes("{")) continue;
      if (t === "from {" || t === "to {" || /^[0-9]+% \{/.test(t)) continue; // keyframes
      if (t.includes("{") && !t.includes(".toss-app") && !t.startsWith("@")) {
        if (/^[a-zA-Z.#\[]/.test(t) && !t.includes(".toss-app")) {
          f.push(`522: overrides 범위 밖 규칙: ${t.slice(0, 60)}`);
          break;
        }
      }
    }
  }

  // 9) scan-bundle-eval + ait:build
  {
    if (!fs.existsSync(path.join(ROOT, "toss-app/scripts/scan-bundle-eval.mjs"))) {
      f.push("522: scan-bundle-eval.mjs 없음");
    }
    const pkg = read("toss-app/package.json");
    if (!pkg.includes("scan-bundle-eval.mjs")) f.push("522: ait:build가 scan 미호출");
  }

  // 고지 경로
  {
    const start = read("components/label-check/ui-517/CheckStart517.tsx");
    const result = read("components/label-check/ui-517/ResultView517.tsx");
    if (!start.includes("DISCLAIMER_PRINT_485")) f.push("522: 시작 화면 고지 상수 없음");
    if (!result.includes("법적 판단이 아닙니다")) f.push("522: 결과 고지 없음");
  }

  return f;
}
