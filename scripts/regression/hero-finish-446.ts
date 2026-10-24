/**
 * 회귀 — 446차 3 히어로 마감: ① 고스트 글자 폭 맞춤 순수 함수(크기 0 또는 ≥44px, 폭 ≤ 좁은 화면 84%) ② 말뭉치 export DOM에서 고스트 글자 상자가 화면 좌우 안쪽(8% 안전 여백 이내가 아닌 넘침 0),
 * ③ 프레임 변주(아치·원형 컷·오프셋 이중 프레임) 3종이 말뭉치에서 모두 쓰이고 결정적, 사진 표식(data-hero-photo) 유지, ④ 사진 뒤 고스트는 면 쪽으로 더 옅게. 호출 0·서버 0.
 */
import { GHOST_MIN_PX, GHOST_ON_PHOTO_MIX, GHOST_SAFE_WIDTH_PX, HERO_FRAMES, ghostColor, ghostEm, ghostFitPx, ghostPx, heroFrameOf } from "../../lib/hero-spec";
import { corpus, displayOf, exportHtmlOf } from "../design-corpus";
import { launch, openHtml } from "../eye-lib";
import { contrastRatioToken } from "../../lib/design-tokens";

export const name = "히어로 마감 — 고스트 폭 맞춤·화면 안 배치·프레임 3종 결정성·사진 뒤 고스트 옅게";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // ① 순수 함수
  const words = ["서", "시카", "수분 진정", "시카 진정 세럼", "코튼 극세사 수건", "오버핏 그래픽 반팔 티셔츠", "NOISE CANCELLING", "저소음 기계식 키보드", "A1"];
  for (const w of words) {
    const px = ghostFitPx(w);
    if (px !== 0 && px < GHOST_MIN_PX) fails.push(`${w}: 고스트 ${px}px < ${GHOST_MIN_PX}`);
    if (px > ghostPx(w)) fails.push(`${w}: 맞춤 크기가 원래보다 큼`);
    if (px && px * ghostEm(w) > GHOST_SAFE_WIDTH_PX + 1) fails.push(`${w}: 폭 ${(px * ghostEm(w)).toFixed(0)} > ${GHOST_SAFE_WIDTH_PX}`);
  }
  if (ghostFitPx("오버핏 그래픽 반팔 티셔츠") !== 0) fails.push("12자 한글 고스트는 꺼져야 함");
  if (ghostFitPx("시카") !== ghostPx("시카")) fails.push("짧은 단어는 원래 크기");
  // ④ 사진 뒤 고스트는 더 옅게(섞는 비율 상한이 더 낮다), 그래도 흰 글자 4.5:1
  const face = "#1D79C4";
  const normal = ghostColor(face, "#FFFFFF", "#FFFFFF");
  const onPhoto = ghostColor(face, "#FFFFFF", "#FFFFFF", GHOST_ON_PHOTO_MIX);
  const dist = (a: string) => contrastRatioToken(a, face);
  if (!(dist(onPhoto) <= dist(normal))) fails.push("사진 뒤 고스트가 더 옅지 않음");
  if (contrastRatioToken("#FFFFFF", onPhoto) < 4.5) fails.push("사진 뒤 고스트 위 흰 글자 대비 < 4.5");

  // ③ 프레임
  const used = new Set<string>();
  const b = await launch();
  for (const [id, file] of corpus()) {
    if (!id.startsWith("fx-")) continue;
    const html = exportHtmlOf(file);
    const hero = displayOf(file).sections[0] as { v2?: { variant?: string; whiteBg?: boolean; v3?: { motifVariant: number } } };
    const fr = /data-hero-frame="(\w+)"/.exec(html)?.[1];
    if (fr) used.add(fr);
    if (hero.v2?.variant === "B" && !hero.v2.whiteBg) {
      const want = heroFrameOf({ v3: hero.v2.v3 });
      used.add(want);
      if (want !== "arch" && fr !== want) fails.push(`${id}: 프레임 ${want} 기대, 실제 ${fr ?? "arch"}`);
      if (want === "arch" && fr) fails.push(`${id}: 아치인데 프레임 표식 ${fr}`);
      if (!/<div data-hero-photo/.test(html)) fails.push(`${id}: 사진 표식(data-hero-photo) 없음`);
    }
    // ② 고스트 상자가 화면 안
    if (/data-hl="ghost"/.test(html)) {
      const ex = await openHtml(b, html, 390);
      const rects = (await ex.page.evaluate(`Array.from(document.querySelectorAll('[data-hl="ghost"]')).map((s) => { const r = document.createRange(); r.selectNodeContents(s); const b = r.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), parseFloat(getComputedStyle(s).fontSize)]; })`)) as Array<[number, number, number]>;
      for (const [l, r, fs] of rects) {
        if (l < 0 || r > 390) fails.push(`${id}: 고스트 글자가 화면 밖(${l}~${r}px, ${fs}px)`);
        if (fs < GHOST_MIN_PX) fails.push(`${id}: 고스트 ${fs}px < ${GHOST_MIN_PX}`);
      }
      await ex.close();
    }
  }
  await b.close();
  for (const f of HERO_FRAMES) if (!used.has(f)) fails.push(`프레임 ${f}이 말뭉치에서 한 번도 안 쓰임`);
  return fails;
}
