/**
 * 523 — 토스 미니앱 출시 가드 (금지어·외부이동·글씨·움직임·demo·아이콘·copy)
 */
import fs from "node:fs";
import path from "node:path";

export const name = "표시사항 523 — 토스 출시 가드";

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
  const cssBlob = files
    .filter((p) => /\.css$/.test(p))
    .map((p) => fs.readFileSync(p, "utf8"))
    .join("\n");

  if (!fs.existsSync(path.join(tossSrcDir, "copy.ts"))) f.push("523: copy.ts 없음");
  if (!fs.existsSync(path.join(tossSrcDir, "ui", "icons.tsx"))) f.push("523: ui/icons.tsx 없음");

  for (const w of FORBIDDEN) {
    for (const file of files.filter((p) => /\.tsx?$/.test(p))) {
      const src = fs.readFileSync(file, "utf8");
      if (src.includes(w)) f.push(`523: 금지어 "${w}" in ${path.relative(ROOT, file)}`);
    }
  }

  if (/href=["']http/.test(tsBlob)) f.push("523: href=http");
  if (/window\.open/.test(tsBlob)) f.push("523: window.open");
  if (/location\.href\s*=/.test(tsBlob)) f.push("523: location.href =");
  if (/window\.print/.test(tsBlob)) f.push("523: window.print");

  // 자체 뒤로가기 버튼(토스 내비와 이중) — 문구 휴리스틱
  if (/뒤로\s*가기|←\s*뒤로|back\s*button/i.test(tsBlob) && /aria-label=["'][^"']*뒤로/.test(tsBlob)) {
    f.push("523: 자체 뒤로가기 버튼 의심");
  }

  {
    const result = read("components/label-check/ui-517/ResultView517.tsx");
    if (!result.includes("참고용 사전 점검이며 법적 판단이 아닙니다")) {
      f.push("523: 고지 문장 유지 실패");
    }
    if (!tsBlob.includes("ResultView517")) f.push("523: ResultView517 미사용");
  }

  // 가장 작은 글씨 12.5px 미만 금지 (toss-app/src CSS)
  {
    const re = /font-size\s*:\s*([0-9.]+)px/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(cssBlob))) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n < 12.5) {
        f.push(`523: font-size ${n}px < 12.5 in toss-app CSS`);
        break;
      }
    }
  }

  if (!cssBlob.includes("prefers-reduced-motion")) f.push("523: prefers-reduced-motion 없음");
  if (!cssBlob.includes("hover: none") && !cssBlob.includes("(hover: none)")) {
    f.push("523: hover:none 처리 없음");
  }

  // demo 출시 빌드 꺼짐
  {
    const enabled = read("toss-app/src/demo/enabled.ts");
    if (!enabled.includes("import.meta.env.DEV") || !enabled.includes("VITE_DEMO")) {
      f.push("523: demoEnabled 가드 약함");
    }
    const pkg = read("toss-app/package.json");
    if (/ait:build[^"]*VITE_DEMO=1/.test(pkg) || /"ait:build"[^,]*VITE_DEMO/.test(pkg)) {
      f.push("523: ait:build에 VITE_DEMO 켜짐");
    }
  }

  // 글자 화살표·체크를 아이콘 대신 쓰지 않음 (toss-app/src · 주석 제외)
  {
    const codeOnly = tsBlob
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    if (/[→↓]/.test(codeOnly)) f.push("523: 화살표 글자(→/↓) 사용");
    if (/["'`][^"'`]*✓[^"'`]*["'`]/.test(codeOnly) || />\s*✓\s*</.test(codeOnly)) {
      f.push("523: 체크 글자(✓)를 UI에 사용");
    }
  }

  return f;
}
