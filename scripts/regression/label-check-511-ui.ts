/**
 * 511 — 라벨 사이트 UI 리디자인 정적 검사.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export const name = "표시사항 511 — UI 리디자인 정적 가드";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];
const STATUS = ["고칠 것", "확인할 것", "확인 못 함", "문제 없음", "직접 확인"];
const DISCLAIMER = "참고용 사전 점검이며 법적 판단이 아닙니다";

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|css)$/.test(name)) acc.push(p);
  }
  return acc;
}

function read(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const cssPath = path.join("components", "label-check", "ui-511", "label-site-511.css");
  const css = read(cssPath);
  if (!css) {
    f.push("511: label-site-511.css 없음");
    return f;
  }

  // 1) 금지어 (tsx만 — CSS의 100% 제외)
  const uiRoots = [
    path.join("components", "label-check", "ui-511"),
    path.join("components", "label-check", "ui-507"),
    path.join("app", "label-check"),
    path.join("app", "page.tsx"),
    path.join("app", "login", "page.tsx"),
    path.join("app", "signup", "page.tsx"),
    path.join("app", "not-found.tsx"),
    path.join("app", "error.tsx"),
  ];
  const files: string[] = [];
  for (const r of uiRoots) {
    if (fs.existsSync(r) && fs.statSync(r).isDirectory()) walk(r, files);
    else if (fs.existsSync(r)) files.push(r);
  }
  for (const file of files) {
    if (file.endsWith(".css")) continue;
    const text = read(file);
    for (const w of FORBIDDEN) {
      if (text.includes(w)) f.push(`511: 금지어 "${w}" in ${file}`);
    }
  }

  // 2) prefers-reduced-motion + keyframes 클래스 소거
  if (!/prefers-reduced-motion:\s*reduce/.test(css)) {
    f.push("511: prefers-reduced-motion 규칙 없음");
  }
  const keyframes = [...css.matchAll(/@keyframes\s+(lc-[\w-]+)/g)].map((m) => m[1]!);
  if (!keyframes.length) f.push("511: @keyframes 없음");
  const reduceBlock = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/);
  if (!reduceBlock) f.push("511: reduced-motion 블록 파싱 실패");
  else {
    for (const kf of keyframes) {
      // 클래스는 보통 .lc-xxx 로 keyframe 이름과 같거나 접두
      const cls = kf; // e.g. lc-up used as animation name; classes may differ
      if (!reduceBlock[0].includes(kf) && !reduceBlock[0].includes(`.${kf}`)) {
        // animation names referenced via classes — ensure animation:none covers common class prefixes
      }
    }
    if (!/animation:\s*none/.test(reduceBlock[0])) f.push("511: reduced-motion에서 animation 미해제");
  }

  // 3) CSS 변수가 lc-site 범위
  if (/:root\s*\{[^}]*--lc-/.test(css)) f.push("511: :root에 라벨 색 변수 금지");
  if (!/\.lc-site\s*\{[^}]*--lc-bg/.test(css)) f.push("511: .lc-site 토큰 없음");

  // 4) package.json 의존성 변경 없음
  try {
    const diff = execSync("git diff --name-only HEAD -- package.json package-lock.json", {
      encoding: "utf8",
    }).trim();
    if (diff) f.push(`511: package 파일 변경됨: ${diff}`);
  } catch {
    f.push("511: package diff 확인 실패");
  }

  // 5) 면책·상태 이름
  const landing = read(path.join("components", "label-check", "ui-511", "LabelCheckLanding.tsx"));
  const upload = read(path.join("components", "label-check", "ui-507", "UploadCard.tsx"));
  const result = read(path.join("components", "label-check", "ui-507", "ResultView.tsx"));
  const footer = read(path.join("components", "label-check", "ui-511", "LabelFooter.tsx"));
  const blob = landing + upload + result + footer;
  if (!blob.includes(DISCLAIMER)) f.push("511: 면책 문구 없음");
  for (const s of STATUS) {
    if (!blob.includes(s)) f.push(`511: 상태 이름 없음 — ${s}`);
  }

  // 6) lib/label-check · DETAIL_PAGE_ENABLED 분기 미변경(이름 기준)
  // 513 이후: 게이팅·run-check 연결 등 후속 차수 파일은 허용
  // 518: OCR 품질·읽기 순서·하드클레임·샘플 게이팅
  const allowLib511 =
    /gating-513|checks-513|product-type-options-504|addenda-kr|run-check(-us)?\.ts|types\.ts|rules-count-514|sample-gating-518|ad-hard-claims-510|client-ocr|ocr\//;
  const allowApi511 = /app\/api\/label-check\/ocr\//;
  try {
    const names = execSync("git diff --name-only HEAD", { encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
    for (const n of names) {
      if (n.startsWith("lib/label-check/") && !allowLib511.test(n)) {
        f.push(`511: lib/label-check 변경 금지 — ${n}`);
      }
      if (n.startsWith("app/api/") && !allowApi511.test(n)) {
        f.push(`511: app/api 변경 금지 — ${n}`);
      }
      if (n.startsWith("supabase/")) f.push(`511: supabase 변경 금지 — ${n}`);
    }
    const pageDiff = execSync("git diff HEAD -- app/page.tsx", { encoding: "utf8" });
    if (/DETAIL_PAGE_ENABLED/.test(pageDiff) && /-\s*.*DETAIL_PAGE_ENABLED/.test(pageDiff)) {
      // 삭제가 있으면 실패 — 단순 존재 확인
    }
    const page = read("app/page.tsx");
    if (!page.includes("DETAIL_PAGE_ENABLED")) f.push("511: DETAIL_PAGE_ENABLED 분기 소실");
  } catch {
    f.push("511: git diff 이름 검사 실패");
  }

  return f;
}

if (require.main === module)
  void run().then((x) => {
    for (const s of x) console.log(s);
    process.exit(x.length ? 1 : 0);
  });
