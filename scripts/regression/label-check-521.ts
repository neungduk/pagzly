/**
 * 521 — 토스 미니앱 정적 화면(toss-app) 가드
 */
import fs from "node:fs";
import path from "node:path";
import { pdfjsBase521 as pdfjsFromExtract } from "../../lib/label-check/client-extract-pdf";
import { pdfjsBase521 as pdfjsFromPrepare } from "../../lib/label-check/client-ocr-prepare";

export const name = "표시사항 521 — 토스 미니앱 정적 화면";

const ROOT = process.cwd();
const FORBIDDEN = ["무료", "요금", "1분", "위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];
/** 서버 전용 — client-extract-pdf / extracted-payload-shared 는 허용 */
const SERVER_IMPORT_RE =
  /from\s+["'][^"']*(?:extracted-payload\.ts|\/extracted-payload["']|load-rules|run-check|\/extract-pdf["']|label-check\/extract-pdf|node:fs|next\/server)/;

function walkSrc(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === "public") continue;
      walkSrc(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const tossSrcFiles = walkSrc(path.join(ROOT, "toss-app", "src"));

  // 1) 서버 전용 import 금지 (화면 소스만)
  for (const file of tossSrcFiles) {
    const src = fs.readFileSync(file, "utf8");
    if (SERVER_IMPORT_RE.test(src)) {
      f.push(`521: 서버 모듈 import ${path.relative(ROOT, file)}`);
    }
    // client-extract-pdf 는 허용 — 서버 extract-pdf.ts 경로만 금지
    if (/from\s+["']@\/lib\/label-check\/extract-pdf["']/.test(src)) {
      f.push(`521: 서버 extract-pdf import ${path.relative(ROOT, file)}`);
    }
  }

  // 2) 루트 package에 vite / apps-in-toss 없음
  {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const key of Object.keys(all)) {
      if (key === "vite" || key.startsWith("@apps-in-toss/") || key === "@vitejs/plugin-react") {
        f.push(`521: 루트 deps에 ${key}`);
      }
    }
  }

  // 3) PDFJS_BASE 기본값
  {
    const g = globalThis as { window?: Window & { __PAGZLY_PDFJS_BASE__?: string } };
    const prev = g.window;
    // Node: window 없음 → 기본 경로
    delete (g as { window?: unknown }).window;
    if (pdfjsFromExtract() !== "/label-check-pdfjs") {
      f.push(`521: extract 기본 base=${pdfjsFromExtract()}`);
    }
    if (pdfjsFromPrepare() !== "/label-check-pdfjs") {
      f.push(`521: prepare 기본 base=${pdfjsFromPrepare()}`);
    }
    // 전역 값
    (g as { window: Window & { __PAGZLY_PDFJS_BASE__?: string } }).window = {
      __PAGZLY_PDFJS_BASE__: "./label-check-pdfjs",
    } as Window & { __PAGZLY_PDFJS_BASE__?: string };
    if (pdfjsFromExtract() !== "./label-check-pdfjs") {
      f.push(`521: extract 전역 base=${pdfjsFromExtract()}`);
    }
    if (pdfjsFromPrepare() !== "./label-check-pdfjs") {
      f.push(`521: prepare 전역 base=${pdfjsFromPrepare()}`);
    }
    if (prev === undefined) delete (g as { window?: unknown }).window;
    else g.window = prev;
  }

  // 4) tsconfig exclude
  {
    const ts = JSON.parse(read("tsconfig.json")) as { exclude?: string[] };
    if (!(ts.exclude || []).includes("toss-app")) f.push("521: tsconfig exclude에 toss-app 없음");
  }

  // 5) 금지어 · console.log 원문 금지 · 고지
  // 522 — 고지는 재사용 컴포넌트(CheckStart517 DISCLAIMER_PRINT_485 · ResultView517 바닥) 경로로 검사
  {
    const checkScreen = path.join(ROOT, "toss-app", "src", "CheckScreen.tsx");
    const checkSrc = fs.existsSync(checkScreen) ? fs.readFileSync(checkScreen, "utf8") : "";
    const start517 = read("components/label-check/ui-517/CheckStart517.tsx");
    const result517 = read("components/label-check/ui-517/ResultView517.tsx");
    const viaReuse =
      checkSrc.includes("CheckStart517") &&
      checkSrc.includes("ResultView517") &&
      start517.includes("DISCLAIMER_PRINT_485") &&
      result517.includes("법적 판단이 아닙니다");
    let hasDisclaimer = viaReuse;
    for (const file of tossSrcFiles) {
      const src = fs.readFileSync(file, "utf8");
      const rel = path.relative(ROOT, file);
      if (src.includes("법적 판단이 아닌")) hasDisclaimer = true;
      for (const w of FORBIDDEN) {
        if (src.includes(w)) f.push(`521: 금지어 "${w}" in ${rel}`);
      }
      if (/console\.log\s*\(/.test(src)) {
        f.push(`521: console.log in ${rel}`);
      }
    }
    if (!hasDisclaimer) f.push("521: 법적 판단 고지 없음(재사용 경로·toss-app 모두 미검출)");
  }

  // 7) gitignore pdfjs
  {
    const gi = read("toss-app/.gitignore");
    if (!gi.includes("label-check-pdfjs")) f.push("521: .gitignore에 label-check-pdfjs 없음");
  }

  // 8) 521c — 토스 번들 검사는 eval( 을 반려한다. pdfjs 복사본에서 eval·new Function 을 없애는 단계가 있어야 한다.
  {
    const cp = read("toss-app/scripts/copy-label-check-pdfjs.mjs");
    if (!cp.includes("neutralizeEval") || !cp.includes("new Function") || !cp.includes("eval_disabled")) {
      f.push("521c: pdfjs 복사 스크립트에 eval·new Function 제거 단계 없음");
    }
    if (!/process\.exit\(1\)/.test(cp) || !cp.includes("남아 있음")) {
      f.push("521c: eval 잔존 시 빌드 중단 검사 없음");
    }
  }

  return f;
}
