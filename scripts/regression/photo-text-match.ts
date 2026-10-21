/**
 * 회귀 — 419차 3-2 글·사진 일치 게이트(뷰티). 418차 뷰티 세션의 비전 태그 그대로(고정 입력), 호출 0.
 * 418차 캡처의 5곳(갤러리 "책상, 가방, 화장 위"·"미스트 안개"·"휴대 30mL"·"손에 쥐는 크기"·상자 구성)이 해소되는지,
 * 뷰티가 아니거나 flag off이거나 태그가 없으면 입력 그대로인지 점검한다.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { NEUTRAL_HEADING, insertCompositionGallery, matchPhotosToText, photoKinds, satisfies, textNeed, isCarryText } from "../../lib/photo-text-match";
import { sectionImageIndexes } from "../../lib/image-source-cap";
import type { DetailSection } from "../../lib/types/generate";

export const name = "글·사진 일치 게이트(뷰티) — 418차 5곳 해소·플래그/패션/태그 없음 불변·사용 상한·고정 문구";

/** 418차 세션 visionImageRoles의 index별 태그(그대로) */
const TAGS: string[][] = [
  ["정면", "단독", "그림자"], ["손", "들기", "캡 클로즈업"], ["손", "분사구", "사용"], ["펌프", "클로즈업", "질감"], ["박스", "구성품", "패키지"],
  ["라벨", "제조일자", "각도컷"], ["비교", "색상변화", "두개"], ["세개", "나열", "구성"], ["캡 분리", "펌프", "디테일"], ["박스", "용량표기", "패키지"],
];
const ROLES = ["hero", "lifestyle", "lifestyle", "hero", "package", "detail", "other", "other", "other", "package", "lifestyle", "lifestyle", "other", "other", "other", "other"];
const ORIGINS = ["enhanced", "enhanced", "enhanced", "enhanced", "enhanced", "enhanced", "enhanced", "enhanced", "original", "original", "enhanced", "enhanced", "compare", "compare", "fx", "fx"];
const URLS = Array.from({ length: 16 }, (_, i) => `https://x.test/${i}.png`);

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const sections = (): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "H", subheadline: "s", imageIndex: 0 }),
  S({ type: "image_text", slot: "quick_points", heading: "미스트 안개", body: "얼굴에서 15cm, 고르게 퍼지는 물방울입니다.", layout: "compact", imageIndex: 1, imagePosition: "left" }),
  S({ type: "image_text", slot: "quick_points", heading: "휴대 30mL", body: "파우치 한 칸에 들어가는 크기입니다.", layout: "compact", imageIndex: 2, imagePosition: "left" }),
  S({ type: "gallery", slot: "gallery", heading: "책상, 가방, 화장 위", imageIndexes: [8, 11, 14] }),
  S({ type: "image_text", slot: "packaging_design", heading: "손에 쥐는 크기", body: "반투명 화이트 용기 안에서 연한 미색이 골드빛으로 이어집니다.", layout: "full", imageIndex: 4, imagePosition: "left" }),
  S({ type: "spec_table", slot: "spec_table", heading: "제품 정보", rows: [{ label: "브랜드", value: "glowiest" }], imageIndexes: [2] }),
];
const ctx = (over: Record<string, unknown> = {}) => ({ category: "화장품/뷰티", roles: ROLES, origins: ORIGINS, tags: TAGS, ...over });

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // 사진 종류·글 요구
  const kinds = (i: number) => photoKinds({ role: ROLES[i], origin: ORIGINS[i], tags: TAGS[i] });
  if (!kinds(1).has("hand") || kinds(1).has("spray")) fails.push("1번(손에 든 컷)이 hand 단독이 아님");
  if (!kinds(2).has("spray") || !kinds(2).has("hand")) fails.push("2번(손 분사)이 spray+hand가 아님");
  if (!kinds(4).has("box") || !kinds(9).has("box") || kinds(0).has("box")) fails.push("상자 컷 판정이 다름");
  if (kinds(14).size !== 0 || kinds(12).size !== 0) fails.push("확대·비교 복제본·태그 없음은 종류를 단정하면 안 됨");
  if (textNeed("책상, 가방, 화장 위") !== "scene" || textNeed("손에 쥐는 크기", "반투명") !== "hand" || textNeed("미스트 안개", "퍼지는 물방울") !== "spray" || textNeed("구성품") !== "box") fails.push("글 요구 사전이 다름");
  if (textNeed("화장이 뜬 오후", "가방에서 꺼내") !== null) fails.push("본문의 장면 단어가 사진 요구가 됨");
  if (satisfies(new Set(), "hand") !== null) fails.push("태그 없음이 알 수 없음(null)이 아님");

  // 418차 5곳
  const r = matchPhotosToText(sections(), URLS.length, ctx());
  const g = r.sections[3] as { heading: string; imageIndexes: number[] };
  if (g.heading !== NEUTRAL_HEADING.gallery) fails.push(`갤러리 제목이 중립 문구가 아님: ${g.heading}`);
  if (g.imageIndexes.join() !== "8,11,14") fails.push("갤러리 사진이 바뀜(제목만 바뀌어야 함)");
  const q1 = r.sections[1] as { layout?: string; imageIndex: number };
  if (q1.layout !== "text_only") fails.push("'미스트 안개'에 맞지 않는 손에 든 컷이 그대로 남음");
  const q2 = r.sections[2] as { layout?: string; imageIndex: number };
  // 422차: 제품 높이(cm) 입력이 없으면 크기·휴대 카드는 손에 든 컷 없이 글만(제품 크기를 암시하지 않게)
  if (q2.layout !== "text_only") fails.push("'휴대 30mL'에 높이 입력 없이 손에 든 컷이 남음(422차 규칙)");
  const p0 = r.sections[4] as { layout?: string };
  if (p0.layout !== "text_only") fails.push("'손에 쥐는 크기'에 높이 입력 없이 사진이 남음(422차 규칙)");
  // 높이 입력이 있으면 기존 419차 동작: 손 컷 유지·재배정
  const rs = matchPhotosToText(sections(), URLS.length, { ...ctx(), hasSizeInfo: true });
  const q2s = rs.sections[2] as { layout?: string; imageIndex: number };
  if (q2s.layout === "text_only" || q2s.imageIndex !== 2) fails.push("높이 입력이 있는데 '휴대 30mL'의 손 사진이 빠짐");
  const p = rs.sections[4] as { imageIndex: number; heading: string };
  if (!kinds(p.imageIndex).has("hand") || kinds(p.imageIndex).has("box")) fails.push(`'손에 쥐는 크기'에 손 컷이 아닌 사진: ${p.imageIndex}`);
  if (isCarryText("미스트 안개", "퍼지는 물방울") || !isCarryText("휴대 30mL", "파우치") || !isCarryText("손에 쥐는 크기")) fails.push("크기·휴대 문구 판별이 다름");
  if (r.sections.length !== sections().length) fails.push("섹션 개수가 바뀜(1:1이어야 함)");
  for (const [i, s] of r.sections.entries()) if (s.type !== sections()[i]!.type) fails.push(`#${i} 섹션 종류가 바뀜`);
  // 사용 상한
  const uses = new Map<number, number>();
  for (const s of r.sections) for (const i of sectionImageIndexes(s)) uses.set(i, (uses.get(i) ?? 0) + 1);
  for (const [i, n] of uses) if (n > 2) fails.push(`사진 ${i}이 ${n}번 쓰임(상한 2)`);

  // 구성 갤러리: 상자 컷이 비어 있을 때만, spec_table 앞
  const ins = insertCompositionGallery(r.sections, r.sections.map((_, i) => i), URLS.length, ctx());
  const at = ins.sections.findIndex((s) => s.type === "gallery" && s.slot === "composition");
  if (at < 0 || ins.sections[at + 1]?.type !== "spec_table") fails.push("구성 갤러리가 spec_table 앞에 안 생김");
  const comp = ins.sections[at] as { heading: string; imageIndexes: number[] } | undefined;
  if (comp && (comp.heading !== NEUTRAL_HEADING.composition || comp.imageIndexes.some((i) => !kinds(i).has("box")))) fails.push("구성 갤러리에 새 문구 또는 상자 아닌 사진");
  if (ins.sourceIndexes.length !== ins.sections.length) fails.push("sourceIndexes 길이가 섹션 수와 다름");
  // 상자 컷을 이미 쓰는 섹션이 있으면 만들지 않는다
  const keep = insertCompositionGallery(sections(), sections().map((_, i) => i), URLS.length, ctx());
  if (keep.sections.some((s) => s.type === "gallery" && s.slot === "composition")) fails.push("이미 상자 컷을 쓰는데 구성 갤러리를 또 만듦");

  // 불변: 패션·다른 카테고리·flag off·태그 없음
  const offCases: Array<[string, ReturnType<typeof ctx>]> = [
    ["패션", ctx({ category: "의류/패션" })],
    ["flag off", ctx({ enabled: false })],
    ["태그 없음", ctx({ tags: undefined })],
    ["빈 태그", ctx({ tags: [[], []] })],
  ];
  for (const [label, c] of offCases) {
    const base = sections();
    const out = matchPhotosToText(base, URLS.length, c as never);
    if (out.sections !== base || out.changes.length) fails.push(`${label}인데 섹션이 바뀜`);
    const out2 = insertCompositionGallery(base, [0, 1, 2, 3, 4, 5], URLS.length, c as never);
    if (out2.sections !== base) fails.push(`${label}인데 구성 갤러리가 생김`);
  }
  // 장면 이미지가 채워져 있으면 장면 제목을 유지
  const withScene = matchPhotosToText(sections(), URLS.length, ctx({ hasSceneImage: true }));
  if ((withScene.sections[3] as { heading: string }).heading !== "책상, 가방, 화장 위") fails.push("장면 이미지가 있는데 제목을 바꿈");

  // applyDisplayRules 통합: 뷰티 + 태그 → 바뀜, 태그 없음/패션 → 기존과 같음, 편집 모드 → 안 바뀜
  const hints = { roles: ROLES as never, origins: ORIGINS as never };
  const base = applyDisplayRules(sections(), URLS, { category: "화장품/뷰티", ...hints });
  const gated = applyDisplayRules(sections(), URLS, { category: "화장품/뷰티", ...hints, tags: TAGS });
  const galleryHeading = (d: { sections: DetailSection[] }) => d.sections.find((s) => s.type === "gallery" && s.slot === "gallery") as { heading: string } | undefined;
  if (galleryHeading(base)?.heading !== "책상, 가방, 화장 위") fails.push("태그 없는 뷰티가 바뀜");
  if (galleryHeading(gated)?.heading !== NEUTRAL_HEADING.gallery) fails.push("applyDisplayRules가 게이트를 적용하지 않음");
  if (gated.sourceIndexes.length !== gated.sections.length) fails.push("통합 sourceIndexes 길이 불일치");
  const fashion = applyDisplayRules(sections(), URLS, { category: "의류/패션", ...hints, tags: TAGS });
  const fashionBase = applyDisplayRules(sections(), URLS, { category: "의류/패션", ...hints });
  if (JSON.stringify(fashion) !== JSON.stringify(fashionBase)) fails.push("패션 출력이 태그로 바뀜");
  const edit = applyDisplayRules(sections(), URLS, { category: "화장품/뷰티", ...hints, tags: TAGS, editing: true });
  if (galleryHeading(edit)?.heading !== "책상, 가방, 화장 위") fails.push("편집 모드에서 제목이 바뀜");

  // 폴백 제목은 고정 사전에서만
  const allowed = new Set<string>(Object.values(NEUTRAL_HEADING));
  for (const s of gated.sections) if (s.type === "gallery" && s.slot === "composition" && !allowed.has(s.heading)) fails.push("고정 사전 밖 제목");
  return fails;
}
