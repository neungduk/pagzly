/**
 * 회귀 — 죽은 자간 클래스 부활 방지(396차).
 * .pagzly-display-headline 제목의 자간은 app/globals.css의 [data-headline-face] 규칙(카테고리 단일값)이 정한다.
 * 그 요소에 tracking-[…]을 다시 붙이면 적용되지 않는 죽은 코드가 되고, 반대로 globals 규칙을 지우면 화면이 바뀐다.
 */
import fs from "node:fs";
import path from "node:path";

export const name = "죽은 자간 클래스 부활 방지";

const ROOT = path.join(__dirname, "..", "..");

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const renderer = fs.readFileSync(path.join(ROOT, "components", "DetailSectionRenderer.tsx"), "utf8").split(/\r?\n/);
  renderer.forEach((line, i) => {
    if (line.includes("pagzly-display-headline") && /tracking-\[/.test(line)) {
      fails.push(`components/DetailSectionRenderer.tsx:${i + 1} — .pagzly-display-headline 요소에 tracking-[…] (globals 규칙이 덮어써 적용 안 됨)`);
    }
  });
  const css = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
  for (const face of ["serif", "sans-display"]) {
    const re = new RegExp(`\\[data-headline-face="${face}"\\]\\s*\\.pagzly-display-headline\\s*\\{[^}]*letter-spacing:`);
    if (!re.test(css)) fails.push(`app/globals.css — [data-headline-face="${face}"] .pagzly-display-headline 자간 규칙이 없다(제목 자간이 바뀜)`);
  }
  return fails;
}
