/**
 * 회귀 — 413차 스타일 디렉터. 결정성(같은 입력 100회 같은 결과)·시드 변형·빈/부분/이상한 입력에서도 유효한 스펙·호환 규칙 준수·
 * 후보 구조 서명 다양성·패션 외 카테고리는 null. 유료 호출 0.
 */
import { decodeSpec, encodeSpec } from "../../lib/style-packs";
import { directStyle, directorInputFromSession, isAllowed, recommendForSession, structDistance, type DirectorInput } from "../../lib/style-director";

export const name = "스타일 디렉터 — 결정성·유효성·호환·후보 다양성";

const base: DirectorInput = {
  category: "의류/패션",
  targetCustomer: "20~30대 여성",
  price: 59000,
  hasBrand: true,
  productName: "니트",
  moodText: "트렌디하고 경쾌한 캐주얼",
  accentHex: "#C0392B",
  photos: { total: 8, worn: 5, detail: 1, flat: 2, other: 0, heroWorn: true, galleryCount: 5 },
  text: { sectionCount: 26, bodyChars: 3500, hasSizeTable: true },
  seed: "seed-a",
};

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // 결정성
  const first = directStyle(base);
  for (let i = 0; i < 100; i++) if (directStyle(base).code !== first.code) {
    fails.push("같은 입력인데 결과가 달라짐");
    break;
  }
  // 시드가 다르면(신호가 같아도) 결과가 다양하다
  const codes = new Set<string>();
  for (let i = 0; i < 40; i++) codes.add(directStyle({ ...base, seed: `s${i}` }).code);
  if (codes.size < 8) fails.push(`시드 40개에서 서로 다른 스펙이 ${codes.size}개뿐`);
  // 유효성: 이상한 입력
  const weird: DirectorInput[] = [
    { category: "의류/패션" },
    { category: "의류/패션", price: -5 },
    { category: "의류/패션", price: Number.NaN as unknown as number },
    { category: "의류/패션", targetCustomer: "???", moodText: "", accentHex: "red" },
    { category: "의류/패션", photos: { total: 0, worn: 0, detail: 0, flat: 0, other: 0, heroWorn: false, galleryCount: 0 } },
    { category: "의류/패션", photos: { total: 1, worn: 0, detail: 0, flat: 1, other: 0, heroWorn: false, galleryCount: 0 }, text: { sectionCount: 0, bodyChars: 0, hasSizeTable: false } },
    { ...base, photos: { ...base.photos!, galleryCount: 2 } },
    { ...base, photos: { ...base.photos!, heroWorn: false, galleryCount: 3 } },
  ];
  for (const [i, w] of weird.entries()) {
    const r = directStyle(w);
    if (!decodeSpec(r.code)) fails.push(`이상한 입력 ${i}: 디코딩 불가`);
    if (r.candidates.length < 1) fails.push(`이상한 입력 ${i}: 후보 없음`);
    for (const c of r.candidates) if (!isAllowed(c.axes, w) && w.photos) fails.push(`이상한 입력 ${i}: 호환 규칙 밖 후보 ${c.label}`);
  }
  // 호환: 갤러리가 적으면 mosaic·lead-plus-two가 나오지 않는다 / 히어로가 인물이 아니면 framed가 나오지 않는다
  for (let i = 0; i < 60; i++) {
    const few = directStyle({ ...base, seed: `f${i}`, photos: { ...base.photos!, galleryCount: 2 } });
    for (const c of few.candidates) if (c.axes.gallery === "mosaic" || c.axes.gallery === "lead-plus-two") fails.push("갤러리 2장인데 mosaic/lead-plus-two");
    const noHero = directStyle({ ...base, seed: `h${i}`, photos: { ...base.photos!, heroWorn: false } });
    for (const c of noHero.candidates) if (c.axes.hero === "framed") fails.push("히어로가 인물이 아닌데 framed");
    const none = directStyle({ ...base, seed: `n${i}`, photos: { total: 0, worn: 0, detail: 0, flat: 0, other: 0, heroWorn: false, galleryCount: 0 } });
    for (const c of none.candidates) if (c.axes.hero !== "bleed-bottom" || c.axes.gallery !== "duo-grid" || c.axes.flow !== "default") fails.push("사진이 없는데 변형이 켜짐");
  }
  // 후보 다양성: 구조 서명이 서로 5축 중 2축 이상 다르다
  for (let i = 0; i < 30; i++) {
    const r = directStyle({ ...base, seed: `d${i}` });
    for (let a = 0; a < r.candidates.length; a++) for (let b = a + 1; b < r.candidates.length; b++) {
      if (structDistance(r.candidates[a]!.axes, r.candidates[b]!.axes) < 0.4) fails.push("후보끼리 구조가 비슷함");
    }
    if (r.code !== r.candidates[0]!.code) fails.push("추천이 후보 첫 번째가 아님");
  }
  // 패션 외 → null, 세션 변환이 빈 객체에서도 안 죽음
  if (recommendForSession({ category: "화장품/뷰티" }) !== null) fails.push("패션 외 카테고리가 추천을 받음");
  if (!recommendForSession({})) fails.push("빈 세션(카테고리 없음)이 추천을 못 받음");
  if (encodeSpec(directStyle(directorInputFromSession({})).axes).length < 10) fails.push("빈 세션 결과 이상");
  return fails.slice(0, 10);
}
