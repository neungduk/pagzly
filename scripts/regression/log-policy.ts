/**
 * 회귀 — 426차 W8 로그 정책. 서버 로그(app/api·lib의 console.*)에 상품명·브랜드명·도매 주소 전문이 찍히지 않는다. 호출 0.
 */
import fs from "node:fs";
import path from "node:path";

export const name = "로그 정책 — console.* 에 상품명·브랜드명·도매 주소 전문 없음";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 보호 파일(수정 금지, CLAUDE.md): 사진 알고리즘 파일의 상품명 로그는 건드리지 않고 보고서에 남은 항목으로 기록한다 */
const PROTECTED_SKIP = new Set([path.join("lib", "photo-enhance.ts"), path.join("lib", "photo-composite.ts"), path.join("lib", "lifestyle-product-composite.ts")]);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const bad = /productName|brandName|wholesale\.slice|wholesaleUrl\.slice/;
  for (const file of [...walk("app/api"), ...walk("lib")]) {
    if (PROTECTED_SKIP.has(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!/console\.(log|warn|error|info)\(/.test(line)) return;
      // 호출이 여러 줄이면 다음 2줄까지 함께 본다
      const chunk = [line, lines[i + 1] ?? "", lines[i + 2] ?? ""].join("\n");
      if (bad.test(chunk)) fails.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  return fails;
}
