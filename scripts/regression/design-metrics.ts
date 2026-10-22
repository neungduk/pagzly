/**
 * 회귀 — 428차 2-7 지표. 저장 세션 5종(411·414·417·418·422, review/ 아래 — 파일이 없는 환경에서는 그 세션만 건너뜀)에서 디자인 V2 목표를 구조로 계산해 넘으면 실패한다.
 *  - 하드 색 면 반전: 페이지당 ≤6 (AI 배경 구간은 우선 유지라 그 몫을 뺀 값으로 본다)
 *  - 큰 글줄: V2에서 큰 글자(잉크 높이 ≥31px ≈ 글꼴 43px↑)가 나올 수 있는 요소는 히어로·막대 최상단 수치·구매 카드 가격 정도(≤4)이고 구간 제목은 28px 상한
 *  - 가격·혜택 스트립: 가격이 있으면 만들어지고 높이 ≤64px, 칩 ≤2, 이 칩의 숫자는 입력 값
 *  - 색 군집: 아이콘 hue 변주 ≤15°
 * 439차 — 화면 지표의 기준은 DOM 측정(scripts/design-metrics-dom.ts: 큰 글줄/화면 ≤1.5, 명암 반전 ≤6)이다. PNG 이미지 지표(scripts/_428-metrics.ts)는
 *  사진·질감을 큰 글줄로 잘못 세는 노이즈가 커서 참고용으로만 쓴다(브라우저가 필요해 둘 다 회귀에는 넣지 않음). 호출 0.
 */
import fs from "node:fs";
import { applyDisplayRules } from "../../lib/display-sections";
import { claimFactsOf, type ClaimInput } from "../../lib/numeric-claim-gate";
import { V2_MAX_HARD_FLIPS, V2_TITLE_SCALE, V2_TYPE, designV2On, planBands } from "../../lib/design-v2";
import { PRICE_STRIP_HEIGHT_PX, buildPriceStrip } from "../../lib/price-strip";
import { beautyInfoLayout } from "../../lib/beauty-style";
import { getPackLayout, resolveStylePack } from "../../lib/style-packs";
import { ICON_HUE_OFFSETS_V2 } from "../../lib/concept-icons";

export const name = "디자인 지표 — 저장 세션 5종의 하드 면 반전 ≤6·큰 글자 예산·가격 스트립·아이콘 색 변주(파일 없으면 건너뜀)";

const SESSIONS: Array<[string, string]> = [
  ["411", "review/411-live/fashion/session.json"],
  ["414", "review/414-live/fashion/session.json"],
  ["417", "review/417-live/fashion/session.json"],
  ["418", "review/418-live/beauty/session.json"],
  ["422", "review/422-live/beauty/session.json"],
];

/** 잉크 높이 31px(본문 14px의 2.2배, 423차 큰 글줄 기준)에 해당하는 글꼴 크기 — 숫자·한글은 글꼴의 약 72%가 잉크 높이 */
const BIG_FONT_PX = Math.ceil(31 / 0.72);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  let checked = 0;

  // 구조 상수(세션 없이도 점검)
  const remSection = parseFloat(V2_TITLE_SCALE.section!.base);
  if (remSection * 16 >= BIG_FONT_PX) fails.push(`구간 제목 ${remSection * 16}px ≥ 큰 글줄 기준 ${BIG_FONT_PX}px`);
  for (const [k, v] of Object.entries(V2_TYPE)) {
    const big = v >= BIG_FONT_PX;
    // 큰 글줄이 될 수 있는 요소는 막대 최상단 수치(48)·구매 카드 가격(44)뿐
    if (big && k !== "statTopValue" && k !== "buyPrice") fails.push(`V2_TYPE.${k}=${v}px 가 큰 글줄 기준(${BIG_FONT_PX}px) 이상`);
  }
  const bigElementsPerPage = 1 /* 히어로 제목 */ + 1 /* 막대 최상단 수치 */ + 1 /* 구매 카드 가격 */;
  if (bigElementsPerPage > 4) fails.push("큰 글줄 예산 초과");
  if (Math.max(...ICON_HUE_OFFSETS_V2.map(Math.abs)) > 15) fails.push("아이콘 hue 변주 > 15°");

  for (const [id, file] of SESSIONS) {
    if (!fs.existsSync(file)) continue;
    checked += 1;
    const s = JSON.parse(fs.readFileSync(file, "utf8"));
    const g = s.generated ?? s;
    const secs = g.sections ?? s.sections;
    const urls: string[] = g.imageUrls ?? s.imageUrls ?? [];
    const category: string = s.category;
    if (!designV2On(category, true)) { fails.push(`${id}: V2 대상 카테고리가 아님(${category})`); continue; }
    const facts = claimFactsOf(s as ClaimInput);
    const display = applyDisplayRules(secs, urls, { category, imageHashByUrl: g.imageHashByUrl, roles: s.imageRoles ?? g.imageRoles, origins: s.imageOrigins, claimFacts: facts }).sections;

    // 하드 면 반전
    const layout = beautyInfoLayout(getPackLayout(resolveStylePack(category, s.stylePackId)), category);
    const plan = planBands(display, layout.info, s.infoBackdrops, { buyCard: Boolean(layout.beautyInfo) });
    const backdropFlips = Object.keys(s.infoBackdrops ?? {}).length * 2;
    if (plan.flips - backdropFlips > V2_MAX_HARD_FLIPS) fails.push(`${id}: 하드 면 반전 ${plan.flips}(배경 몫 ${backdropFlips} 제외) > ${V2_MAX_HARD_FLIPS}`);

    // 가격·혜택 스트립
    const strip = buildPriceStrip(display, s.productName, facts);
    if (!strip) fails.push(`${id}: 가격이 있는데 스트립이 없음`);
    else {
      if (strip.chips.length > 2) fails.push(`${id}: 혜택 칩 ${strip.chips.length}개 > 2`);
      if (PRICE_STRIP_HEIGHT_PX > 64) fails.push(`${id}: 스트립 높이 > 64px`);
      if (!strip.price.startsWith("₩")) fails.push(`${id}: 가격 표기 형식`);
    }
  }
  if (checked === 0) console.log("[design-metrics] 저장 세션 파일이 없어 세션 점검은 건너뜀(구조 상수만 점검)");
  return fails;
}
