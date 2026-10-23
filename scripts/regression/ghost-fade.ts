/**
 * 회귀 — 443차 4-2 히어로 B형 고스트 글자 가장자리 페이드(DESIGN_V4): B·C·D형 고스트마다 면 색 그라데이션 덮개 한 장(같은 박스, 고스트 뒤 형제),
 * mask·clip-path·filter 없음, 덮개 색은 히어로 면 색, E형에는 없음, 레이어 data-hl 값 집합 불변. 호출 0.
 */
import { GHOST_FADE_V4, ghostFadeBackground } from "../../lib/design-tokens-v4";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "고스트 글자 페이드 — B·C·D형·면 색 그라데이션·금지 기법 없음";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const bg = ghostFadeBackground("#336699");
  if (!bg.includes("rgba(51, 102, 153, 0)") || !bg.startsWith("linear-gradient(90deg,#336699 0%") || bg.includes("mask") || bg.includes("clip")) fails.push(`페이드 배경 형태: ${bg}`);
  if (GHOST_FADE_V4.sidePct * 2 >= 100 || GHOST_FADE_V4.topPct >= 100) fails.push("페이드 범위 값 이상");
  let bHeroes = 0;
  for (const [id, f] of corpus()) {
    const h = exportHtmlOf(f);
    for (const m of h.matchAll(/<section data-hero-v2="([A-E])"[\s\S]*?<\/section>/g)) {
      const variant = m[1]!;
      const hero = m[0];
      const fades = (hero.match(/data-hl-fade="ghost"/g) ?? []).length;
      const ghosts = (hero.match(/data-hl="ghost"/g) ?? []).length;
      if (variant === "B" || variant === "C" || variant === "D") {
        if (variant === "B") bHeroes += 1;
        if (fades !== ghosts) fails.push(`${id}: ${variant}형 고스트 ${ghosts}개인데 페이드 ${fades}개`);
        const fade = /data-hl-fade="ghost" style="([^"]*)"/.exec(hero)?.[1] ?? "";
        if (variant === "B") {
          const sec = /<section data-hero-v2="B"[^>]*style="[^"]*background:(#[0-9A-Fa-f]{6})/.exec(hero)?.[1];
          if (fades && sec && !fade.includes(sec)) fails.push(`${id}: 페이드 색이 히어로 면 색(${sec})과 다름`);
        }
        if (/mask|clip-path|filter|mix-blend/.test(fade)) fails.push(`${id}: 페이드에 금지 기법`);
      } else if (fades) fails.push(`${id}: ${variant}형 히어로에 페이드가 있음`);
      const layers = new Set([...hero.matchAll(/data-hl="(\w[\w-]*)"/g)].map((x) => x[1]));
      for (const l of layers) if (!["face", "motif", "ghost", "photo", "name", "hook", "chips", "price", "sticker"].includes(l!)) fails.push(`${id}: 알 수 없는 레이어 값 ${l}`);
    }
  }
  if (corpus().length >= 18 && !bHeroes) fails.push("말뭉치에 B형 히어로 없음(검사 무의미)");
  return fails;
}
