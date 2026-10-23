/**
 * 회귀 — 445차 4: ① 합성 픽스처 히어로 포화 면 색 다양성(같은 색으로 겹친 픽스처 ≤ 2/21, 포화 면을 쓰는 B 히어로끼리는 겹침 ≤ 1) — 원인은 9종이 같은 기본 대표색(#20547E)을 쓴 입력이었고 규칙(heroFaceColor)은 그대로,
 * ② 픽스처 대표색이 scripts/gen-fixture-themes.ts(색상 부여 + 실제 파이프라인 함수)와 일치(세션 최상위 theme·generated.theme 두 곳),
 * ③ 뷰티 퀵포인트 줄 사이 흰 띠 제거(v4): 줄마다 흰색에서 시작하는 그라데이션 → 줄 전체 단색 틴트. CSS 규칙에 그라데이션이 없고, 퀵 줄이 둘 이상인 export DOM에서 줄 배경이 모두 같은 단색이다. 호출 0·서버 0.
 */
import fs from "node:fs";
import { heroFaceColor } from "../../lib/hero-spec";
import { STUDIO_NEUTRAL_SAMPLE, buildThemeFromHueWithNeutral } from "../../lib/color-extract";
import { designV2Css } from "../../lib/design-v2";
import { infoColorsOf } from "../../lib/info-style";
import { corpus, displayOf, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { FIXTURE_HUES } from "../gen-fixture-themes";
import { launch, openHtml } from "../eye-lib";

export const name = "히어로 색 다양성·픽스처 대표색 일치·퀵포인트 줄 사이 흰 띠 없음";

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // ① 히어로 포화 면 색
  const faces = new Map<string, string[]>();
  const bFaces = new Map<string, string[]>();
  let n = 0;
  for (const [id, file] of corpus()) {
    if (!id.startsWith("fx-")) continue;
    n += 1;
    const a = exportArgsOf(readSession(file));
    const hero = displayOf(file).sections[0] as { v2?: { hueHint?: unknown; variant?: string } };
    const face = heroFaceColor(a.theme.accent, hero.v2?.hueHint as never).face;
    faces.set(face, [...(faces.get(face) ?? []), id]);
    if (hero.v2?.variant === "B") bFaces.set(face, [...(bFaces.get(face) ?? []), id]);
  }
  const dup = n - faces.size;
  if (n < 18) fails.push(`합성 픽스처 ${n}개(≥18 기대)`);
  if (dup > 2) fails.push(`히어로 포화 면 색이 겹친 픽스처 ${dup}개 > 2: ${[...faces].filter(([, v]) => v.length > 1).map(([k, v]) => `${k} ${v.join("+")}`).join(" / ")}`);
  const bDup = [...bFaces.values()].reduce((s, v) => s + v.length, 0) - bFaces.size;
  if (bDup > 1) fails.push(`포화 면을 쓰는 B 히어로끼리 겹침 ${bDup} > 1: ${[...bFaces].filter(([, v]) => v.length > 1).map(([k, v]) => `${k} ${v.join("+")}`).join(" / ")}`);

  // ② 픽스처 대표색 일치
  for (const [name, hue] of Object.entries(FIXTURE_HUES)) {
    const d = JSON.parse(fs.readFileSync(`scripts/fixtures/${name}.json`, "utf8")) as { theme?: { accent?: string }; generated?: { theme?: { accent?: string } } };
    const want = buildThemeFromHueWithNeutral(hue, STUDIO_NEUTRAL_SAMPLE).accent;
    if (d.theme?.accent !== want) fails.push(`${name}: 최상위 theme ${d.theme?.accent} ≠ 파생 ${want}`);
    if (d.generated?.theme?.accent !== want) fails.push(`${name}: generated.theme ${d.generated?.theme?.accent} ≠ 파생 ${want}`);
  }

  // ③ 퀵포인트 CSS: v4에서는 그라데이션 없는 단색
  const beauty = corpus().find(([id]) => id === "fx-compare-beauty");
  if (!beauty) return [...fails, "fx-compare-beauty 픽스처가 없음"];
  const a = exportArgsOf(readSession(beauty[1]));
  const css = designV2Css({ scope: "[S]", colors: infoColorsOf(a.theme), level: "bold", category: a.category, beautyInfo: true, sections: [] });
  const quick = /\[S\] \[data-info="quick"\]\{background:([^}]*?)!important\}/.exec(css);
  if (!quick) fails.push("퀵포인트 배경 규칙이 없음");
  else if (/gradient/.test(quick[1]!)) fails.push(`v4인데 퀵포인트 배경이 그라데이션: ${quick[1]}`);

  // ④ export DOM: 퀵 줄이 둘 이상이면 배경이 모두 같은 단색
  const b = await launch();
  let multi = 0;
  for (const [id, file] of corpus()) {
    const html = exportHtmlOf(file);
    if ((html.match(/<section[^>]*data-info="quick"/g) ?? []).length < 2) continue;
    multi += 1;
    const ex = await openHtml(b, html, 390);
    const rows = (await ex.page.evaluate(`Array.from(document.querySelectorAll('section[data-info="quick"]')).map((s) => { const c = getComputedStyle(s); return [c.backgroundColor, c.backgroundImage]; })`)) as Array<[string, string]>;
    if (rows.some(([, img]) => img !== "none")) fails.push(`${id}: 퀵 줄 배경에 이미지/그라데이션 ${rows.map((r) => r[1].slice(0, 30)).join(",")}`);
    if (new Set(rows.map(([c]) => c)).size !== 1) fails.push(`${id}: 퀵 줄 배경색이 줄마다 다름 ${rows.map((r) => r[0]).join(" / ")}`);
    await ex.close();
  }
  await b.close();
  if (!multi) fails.push("퀵 줄이 둘 이상인 말뭉치 입력이 없음(검사 대상 0)");
  return fails;
}
