/**
 * 442차 — 라이브 렌더러도 v4를 끄면(NEXT_PUBLIC_DESIGN_V4=off) 438차와 같은 마크업인지, 렌더 결과 문자열로 확인한다(무료·브라우저 없음).
 * check-v4-off.ts(export)의 라이브판: DetailSectionRenderer를 renderToStaticMarkup으로 뽑아 비교한다.
 *   기준 저장(438차 코드 worktree에서 한 번):  OUT=<폴더> npx tsx scripts/check-v4-off-live.tsx --write
 *   비교(이후 매 항목):                       npx tsx scripts/check-v4-off-live.tsx
 * 기준은 review/442-verify/snap-438-live/<id>.html (커밋 안 함). 기준이 없으면 "건너뜀"으로 통과한다(새 체크아웃).
 * 입력은 결과 페이지가 라이브에 넘기는 값과 같게(export 인자 exportArgsOf 재사용).
 */
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { renderToStaticMarkup } from "react-dom/server";

export const name = "v4 off 동일(라이브) — 438차 기준 라이브 렌더 문자열 diff 0(저장 세션 6 + 합성 픽스처)";
export const SNAP_DIR = "review/442-verify/snap-438-live";

function firstDiff(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return `@${i}: 기준 «${a.slice(Math.max(0, i - 60), i + 80)}» / 현재 «${b.slice(Math.max(0, i - 60), i + 80)}»`;
}

async function liveHtmlOf(file: string): Promise<string> {
  const { exportArgsOf, readSession } = await import("./design-corpus");
  const { default: DetailSectionRenderer } = await import("../components/DetailSectionRenderer");
  const a = exportArgsOf(readSession(file));
  return renderToStaticMarkup(
    <DetailSectionRenderer
      sections={a.sections}
      imageUrls={a.imageUrls ?? []}
      category={a.category}
      theme={a.theme}
      productName={a.productName}
      brandName={a.brandName}
      logoUrl={a.logoUrl}
      ingredients={a.ingredients}
      keyFeatures={a.keyFeatures}
      certifications={a.certifications}
      stylePackId={a.stylePackId}
      infoBackdrops={a.infoBackdrops}
      imageHashByUrl={a.imageHashByUrl}
      imageOrigins={a.imageOrigins}
      imageRoles={a.imageRoles}
      imageTags={a.imageTags}
      sceneImages={a.sceneImages}
      hasSizeInfo={a.hasSizeInfo}
      claimFacts={a.claimFacts}
    />,
  );
}

async function compare(): Promise<string[]> {
  if (!fs.existsSync(SNAP_DIR)) return [];
  process.env.NEXT_PUBLIC_DESIGN_V4 = "off";
  const { corpus } = await import("./design-corpus");
  const fails: string[] = [];
  for (const [id, file] of corpus()) {
    const snap = path.join(SNAP_DIR, `${id}.html`);
    if (!fs.existsSync(snap)) continue;
    const now = await liveHtmlOf(file);
    const base = fs.readFileSync(snap, "utf8");
    if (now !== base) fails.push(`${id}: 438차 라이브 기준과 다름 ${firstDiff(base, now)}`);
  }
  return fails;
}

/** 회귀(run-all)용: 플래그는 모듈을 불러올 때 읽히므로 따로 띄운 프로세스에서 비교한다 */
export async function run(): Promise<string[]> {
  if (!fs.existsSync(SNAP_DIR)) return [];
  const r = spawnSync("npx", ["tsx", "scripts/check-v4-off-live.tsx"], { encoding: "utf8", shell: true });
  return r.status === 0 ? [] : (r.stdout || r.stderr || "실행 실패").trim().split(/\r?\n/).slice(0, 6);
}

async function main() {
  if (process.argv.includes("--write")) {
    process.env.NEXT_PUBLIC_DESIGN_V4 = "off";
    const out = process.env.OUT ?? SNAP_DIR;
    const { corpus } = await import("./design-corpus");
    fs.mkdirSync(out, { recursive: true });
    for (const [id, file] of corpus()) {
      const a = await liveHtmlOf(file);
      const b = await liveHtmlOf(file);
      if (a !== b) console.log(`경고 ${id}: 같은 입력 두 번 결과가 다름 ${firstDiff(a, b)}`);
      fs.writeFileSync(path.join(out, `${id}.html`), a);
      console.log(`${id}\t${a.length}`);
    }
    return;
  }
  const fails = await compare();
  console.log(fails.length ? fails.join("\n") : `통과 — ${name}`);
  process.exit(fails.length ? 1 : 0);
}

if (process.argv[1] && /check-v4-off-live/.test(process.argv[1])) void main();
