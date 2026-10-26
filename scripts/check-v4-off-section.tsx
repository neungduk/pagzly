/**
 * 454차 2 — 섹션 단독 off 검증. 말뭉치 각 입력의 섹션을 하나씩만 담아 export HTML·라이브 렌더로 뽑아, v4를 끈 상태(NEXT_PUBLIC_DESIGN_V4=off)에서
 * 기준 코드의 출력과 문자열이 같은지 본다. 전체 페이지에서는 표시 예산·표시 규칙으로 빠지는 섹션(FAQ·step_card 등)도 이 방식으로 검증한다(443차~).
 * (443~452차 보고서의 "섹션 단독 off diff"가 쓰던 임시 스크립트 `_snap-iso.tmp.tsx`를 정식 이름으로 저장소에 옮긴 것 — 원본은 저장소에 없어 역할을 보고서에서 읽어 다시 썼다.)
 *   기준 저장(기준 차수 코드 worktree에서 한 번):  OUT=<폴더> npx tsx scripts/check-v4-off-section.tsx --write
 *   비교(이후 매 항목):                           npx tsx scripts/check-v4-off-section.tsx
 * 기준은 review/454-verify/snap-section/<입력id>.json (커밋 안 함). 기준이 없으면 "건너뜀"으로 통과한다(새 체크아웃).
 * 만드는 법 안내는 `npm run pc-verify -- --make-baseline <커밋>` 이후 같은 커밋 worktree에서 위 --write.
 */
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { renderToStaticMarkup } from "react-dom/server";

export const name = "v4 off 동일(섹션 단독) — 기준 export·라이브 섹션 단독 렌더 문자열 diff 0";
export const SNAP_DIR = "review/454-verify/snap-section";

type Snap = { export: string[]; live: string[] };

function firstDiff(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return `@${i}: 기준 «${a.slice(Math.max(0, i - 60), i + 80)}» / 현재 «${b.slice(Math.max(0, i - 60), i + 80)}»`;
}

/** 입력 한 개의 섹션별 단독 렌더(표시 규칙을 거치지 않은 원 섹션 순서) */
async function renderAlone(file: string): Promise<Snap> {
  const { exportArgsOf, readSession } = await import("./design-corpus");
  const { buildDetailPageHtml } = await import("../lib/export-detail-html");
  const { default: DetailSectionRenderer } = await import("../components/DetailSectionRenderer");
  const a = exportArgsOf(readSession(file));
  const out: Snap = { export: [], live: [] };
  for (const s of a.sections) {
    out.export.push(buildDetailPageHtml({ ...a, sections: [s] }));
    out.live.push(
      renderToStaticMarkup(
        <DetailSectionRenderer
          sections={[s]}
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
      ),
    );
  }
  return out;
}

async function compare(): Promise<{ fails: string[]; count: number }> {
  if (!fs.existsSync(SNAP_DIR)) return { fails: [], count: 0 };
  process.env.NEXT_PUBLIC_DESIGN_V4 = "off";
  const { corpus } = await import("./design-corpus");
  const fails: string[] = [];
  let count = 0;
  for (const [id, file] of corpus()) {
    const snapFile = path.join(SNAP_DIR, `${id}.json`);
    if (!fs.existsSync(snapFile)) continue;
    const base = JSON.parse(fs.readFileSync(snapFile, "utf8")) as Snap;
    const now = await renderAlone(file);
    for (const kind of ["export", "live"] as const) {
      if (base[kind].length !== now[kind].length) { fails.push(`${id} ${kind}: 섹션 수가 다름(기준 ${base[kind].length} / 현재 ${now[kind].length})`); continue; }
      now[kind].forEach((h, i) => {
        count += 1;
        if (h !== base[kind][i]) fails.push(`${id} ${kind} #${i}: 기준과 다름 ${firstDiff(base[kind][i]!, h)}`);
      });
    }
  }
  return { fails, count };
}

/** 회귀(run-all)용: 플래그는 모듈을 불러올 때 읽히므로 따로 띄운 프로세스에서 비교한다 */
export async function run(): Promise<string[]> {
  if (!fs.existsSync(SNAP_DIR)) return [];
  const r = spawnSync("npx", ["tsx", "scripts/check-v4-off-section.tsx"], { encoding: "utf8", shell: true });
  return r.status === 0 ? [] : (r.stdout || r.stderr || "실행 실패").trim().split(/\r?\n/).slice(0, 6);
}

async function main() {
  if (process.argv.includes("--write")) {
    process.env.NEXT_PUBLIC_DESIGN_V4 = "off";
    const out = process.env.OUT ?? SNAP_DIR;
    const { corpus } = await import("./design-corpus");
    fs.mkdirSync(out, { recursive: true });
    for (const [id, file] of corpus()) {
      const a = await renderAlone(file);
      const b = await renderAlone(file);
      if (JSON.stringify(a) !== JSON.stringify(b)) console.log(`경고 ${id}: 같은 입력 두 번 결과가 다름`);
      fs.writeFileSync(path.join(out, `${id}.json`), JSON.stringify(a));
      console.log(`${id}\t섹션 ${a.export.length}`);
    }
    return;
  }
  if (!fs.existsSync(SNAP_DIR)) { console.log(`건너뜀 — 기준 없음(${SNAP_DIR}). 만드는 법: 기준 커밋 worktree에서 npx tsx scripts/check-v4-off-section.tsx --write`); return; }
  const { fails, count } = await compare();
  console.log(fails.length ? fails.join("\n") : `통과 — ${name} (${count}건)`);
  process.exit(fails.length ? 1 : 0);
}

if (process.argv[1] && /check-v4-off-section/.test(process.argv[1])) void main();
