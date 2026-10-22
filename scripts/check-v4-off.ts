/**
 * 439차 1-(a) — 디자인 엔진 v4를 끄면(NEXT_PUBLIC_DESIGN_V4=off) 438차와 같은 화면인지, 픽셀이 아니라 export HTML 문자열로 확인한다(무료·브라우저 없음).
 *   기준 저장(438차 코드에서 한 번):  npx tsx scripts/check-v4-off.ts --write
 *   비교(이후 매 항목):              npx tsx scripts/check-v4-off.ts
 * 기준은 review/439-verify/snap-438/<id>.html (커밋 안 함). 기준이 없으면 "건너뜀"으로 통과한다(새 체크아웃).
 * 같은 입력을 두 번 뽑아 같은지(결정성)도 함께 본다.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const name = "v4 off 동일 — 438차 기준 export HTML 문자열 diff 0(저장 세션 6 + 합성 픽스처)";
export const SNAP_DIR = "review/439-verify/snap-438";

/** 첫 번째로 다른 위치 주변을 보여 준다 */
function firstDiff(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return `@${i}: 기준 «${a.slice(Math.max(0, i - 60), i + 80)}» / 현재 «${b.slice(Math.max(0, i - 60), i + 80)}»`;
}

async function compare(): Promise<string[]> {
  if (!fs.existsSync(SNAP_DIR)) return [];
  process.env.NEXT_PUBLIC_DESIGN_V4 = "off";
  const { corpus, exportHtmlOf } = await import("./design-corpus");
  const fails: string[] = [];
  for (const [id, file] of corpus()) {
    const snap = path.join(SNAP_DIR, `${id}.html`);
    if (!fs.existsSync(snap)) continue;
    const now = exportHtmlOf(file);
    const base = fs.readFileSync(snap, "utf8");
    if (now !== base) fails.push(`${id}: 438차 기준과 다름 ${firstDiff(base, now)}`);
  }
  return fails;
}

/** 회귀(run-all)용: 플래그는 모듈을 불러올 때 읽히므로 이미 다른 묶음이 lib를 불러온 프로세스에서는 off로 바꿀 수 없다 → 따로 띄운 프로세스에서 비교한다 */
export async function run(): Promise<string[]> {
  if (!fs.existsSync(SNAP_DIR)) return [];
  const r = spawnSync("npx", ["tsx", "scripts/check-v4-off.ts"], { encoding: "utf8", shell: true });
  return r.status === 0 ? [] : (r.stdout || r.stderr || "실행 실패").trim().split(/\r?\n/).slice(0, 6);
}

async function main() {
  if (process.argv.includes("--write")) {
    process.env.NEXT_PUBLIC_DESIGN_V4 = "off";
    const { corpus, exportHtmlOf } = await import("./design-corpus");
    fs.mkdirSync(SNAP_DIR, { recursive: true });
    for (const [id, file] of corpus()) {
      const a = exportHtmlOf(file);
      const b = exportHtmlOf(file);
      if (a !== b) console.log(`경고 ${id}: 같은 입력 두 번 결과가 다름 ${firstDiff(a, b)}`);
      fs.writeFileSync(path.join(SNAP_DIR, `${id}.html`), a);
      console.log(`${id}\t${a.length}`);
    }
    return;
  }
  const fails = await compare();
  console.log(fails.length ? fails.join("\n") : `통과 — ${name}`);
  process.exit(fails.length ? 1 : 0);
}

if (process.argv[1] && /check-v4-off/.test(process.argv[1])) void main();
