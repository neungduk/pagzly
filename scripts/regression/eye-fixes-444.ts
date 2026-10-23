/**
 * 회귀 — 444차 눈 검수 결함 수정: ① 정보 면(info) 강조 카드가 흰 카드용 어두운 제목(lightEm)을 쓰지 않음(어두운 글자가 강조색 면 위에 놓이던 결함),
 * ② 일러스트 배너 글 스크림 카드가 좁은 폭에서 화면 가장자리를 넘지 않는 번짐(-10% -4%), ③ 정적 구매 띠(.pagzly-cta)의 위로 번지는 스티키 그림자 제거(v4),
 * ④ 구매 결제 마크(data-pz-buy)·구조 불변. 호출 0.
 */
import fs from "node:fs";
import { BANNER_SCRIM_INSET_V4 } from "../../lib/design-tokens-v4";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "444차 눈 검수 수정 — info 강조 카드 글자색·배너 스크림 번짐·구매 띠 그림자";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  if (BANNER_SCRIM_INSET_V4 !== "-10% -4%") fails.push("배너 스크림 번짐 토큰 변경");
  let infoCards = 0;
  let banners = 0;
  for (const [id, f] of corpus()) {
    const h = exportHtmlOf(f);
    // ① data-em(정보 면이 강조색으로 칠하는 카드)에는 흰 면 인라인 배경이 없어야 한다(= lightEm 아님)
    for (const m of h.matchAll(/<div class="[^"]*"[^>]*data-em="1" style="([^"]*)"/g)) {
      infoCards += 1;
      if (/background:#FFFFFF/.test(m[1]!) && /pagzly-hl-grid/.test(h)) fails.push(`${id}: info 강조 카드가 흰 면 인라인 배경(lightEm)을 가짐 — 강조색 면 위 어두운 제목`);
    }
    // ② 배너 스크림
    for (const m of h.matchAll(/position:absolute;inset:([^;]+);border-radius:20px;pointer-events:none;background:rgba\(27,27,24,\.9\)/g)) {
      banners += 1;
      if (m[1] !== BANNER_SCRIM_INSET_V4) fails.push(`${id}: 배너 스크림 번짐 ${m[1]} ≠ ${BANNER_SCRIM_INSET_V4}`);
    }
    // ③ 구매 띠 그림자
    if (!/\.pagzly-cta\{position:relative;z-index:20;box-shadow:none\}/.test(h)) fails.push(`${id}: v4인데 구매 띠에 스티키 그림자가 남음`);
    // ④ 결제 마크 수: 구매 섹션(가격 없는 입력은 없음)은 많아야 한 번
    if ((h.match(/<section[^>]*class="pagzly-cta"/g) ?? []).length > 1) fails.push(`${id}: 구매 섹션 수 이상`);
  }
  const live = fs.readFileSync("components/DetailSectionRenderer.tsx", "utf8");
  if ((live.match(/data-pz-buy="1"/g) ?? []).length !== 1) fails.push("라이브 data-pz-buy 마크가 1개가 아님");
  if (!/inset: BANNER_SCRIM_INSET_V4/.test(live)) fails.push("라이브 배너 스크림이 토큰을 안 읽음");
  if (!/DESIGN_V4_ENABLED \? tokenStyleObject\("shadow-none"\)/.test(live)) fails.push("라이브 구매 띠가 그림자 토큰을 안 읽음");
  if (corpus().length >= 18 && (!banners || !infoCards)) fails.push(`말뭉치에 검사 대상이 없음(배너 ${banners}, info 카드 ${infoCards})`);
  return fails;
}
