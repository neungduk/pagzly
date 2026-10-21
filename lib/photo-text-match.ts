/**
 * 419차 3-2 — 글·사진 일치 게이트(렌더 전 순수 함수, 새 호출 없음).
 * 418차 뷰티 캡처에서 갤러리 제목 "책상, 가방, 화장 위"에 파란 스튜디오 컷, "미스트 안개"에 손에 든 병, "손에 쥐는 크기"에 상자 컷이 붙었다.
 * 사진 정보는 이미 있는 분석 결과(visionImageRoles의 역할·태그)만 쓴다. 없으면(태그가 없는 사진) 아무것도 바꾸지 않는다.
 *  - 글(제목·본문)의 장면·대상 단어를 사전으로 뽑는다 → 맞는 사진이 있으면 다시 배정, 없으면 사진을 빼거나(text_only) 제목을 고정 중립 문구로 바꾼다.
 *  - 새 문구를 지어내지 않는다: 폴백 제목은 NEUTRAL_HEADING 고정 사전에서만 고른다.
 *  - 뷰티(BEAUTY_STYLE_ENABLED)에만 적용한다. 패션·다른 카테고리·flag off는 입력 그대로 돌려준다.
 */
import type { DetailSection, GallerySection } from "@/lib/types/generate";
import { beautyStyleOn } from "@/lib/beauty-style";
import { IMAGE_SOURCE_CAP } from "@/lib/design-tokens";
import { sectionImageIndexes } from "@/lib/image-source-cap";

export type PhotoKind = "front" | "closeup" | "hand" | "spray" | "box" | "multi" | "scene";
export type PhotoMeta = { role?: string; origin?: string; tags?: readonly string[] };

const has = (tags: readonly string[], words: readonly string[]) => tags.some((t) => words.some((w) => t.includes(w)));

/** 사진 태그(비전 분석) → 사진 종류. 태그가 없으면 빈 집합(= 알 수 없음, 게이트가 건드리지 않는다) */
export function photoKinds(meta: PhotoMeta): Set<PhotoKind> {
  const kinds = new Set<PhotoKind>();
  const tags = meta.tags ?? [];
  if (meta.origin === "compare" || meta.origin === "fx") return kinds; // 확대·효과·비교 복제본은 종류를 단정하지 않는다
  if (tags.length === 0) return kinds;
  if (has(tags, ["손", "들기", "쥐"])) kinds.add("hand");
  if (has(tags, ["분사", "분사구"]) && kinds.has("hand")) kinds.add("spray");
  if (has(tags, ["박스", "구성품", "패키지"]) || meta.role === "package") kinds.add("box");
  if (has(tags, ["두개", "세개", "나열", "여러", "비교"])) kinds.add("multi");
  if (has(tags, ["클로즈업", "디테일", "질감", "펌프", "라벨"])) kinds.add("closeup");
  if (has(tags, ["정면", "단독"])) kinds.add("front");
  if (has(tags, ["인물", "모델", "책상", "소품", "장면", "연출 이미지"])) kinds.add("scene");
  return kinds;
}

export type TextNeed = "spray" | "hand" | "box" | "scene";

/** 제목·본문의 장면·대상 단어. 장면 단어는 제목에서만 본다(본문의 "가방에서 꺼내" 같은 문장이 사진 요구가 되지 않게) */
const SCENE_WORDS = ["책상", "화장대", "욕실", "세면대", "사무실", "지하철", "출근", "여행", "침대", "카페", "가방"];
const HAND_WORDS = ["손에 쥐", "한 손", "손안", "손바닥", "쥐는 크기", "실제 크기", "휴대", "파우치"];
const SPRAY_WORDS = ["안개", "분사", "뿌리", "뿌린", "물방울"];
const BOX_WORDS = ["상자", "박스", "구성품", "패키지", "포장"];

/** 422차 — 글 의미가 크기·휴대인 카드(휴대 30mL, 파우치 한 칸 등). 제품 크기 정보 없이 손에 든 컷을 붙이면 크기를 암시하므로 제한한다 */
const CARRY_WORDS = ["휴대", "파우치", "크기", "사이즈"];
export const isCarryText = (heading: string, body = ""): boolean => CARRY_WORDS.some((w) => `${heading ?? ""} ${body ?? ""}`.includes(w));

export function textNeed(heading: string, body = ""): TextNeed | null {
  const h = heading ?? "";
  const all = `${h} ${body ?? ""}`;
  if (SCENE_WORDS.some((w) => h.includes(w))) return "scene";
  if (BOX_WORDS.some((w) => h.includes(w))) return "box";
  if (HAND_WORDS.some((w) => all.includes(w))) return "hand";
  if (SPRAY_WORDS.some((w) => all.includes(w))) return "spray";
  return null;
}

/** 사진 종류가 글 요구를 채우는지: true 채움 / false 안 맞음 / null 알 수 없음(태그 없음) */
export function satisfies(kinds: ReadonlySet<PhotoKind>, need: TextNeed): boolean | null {
  if (kinds.size === 0) return null;
  switch (need) {
    case "spray":
      return kinds.has("spray");
    case "hand":
      return kinds.has("hand");
    case "box":
      return kinds.has("box");
    case "scene":
      return kinds.has("scene");
  }
}

/** 장면 요구인데 장면 사진이 없을 때 제목을 바꿀 고정 문구(새 문구를 만들지 않는다) */
export const NEUTRAL_HEADING = { gallery: "여러 각도로 본 제품", composition: "구성" } as const;

export type PhotoMatchContext = {
  category: string | undefined;
  roles?: ReadonlyArray<string | undefined>;
  origins?: ReadonlyArray<string | undefined>;
  /** 사진별 비전 태그(imageUrls와 같은 인덱스, 뒤쪽 추가 컷은 없을 수 있음) */
  tags?: ReadonlyArray<ReadonlyArray<string> | undefined>;
  /** 장면(합성) 이미지가 채워진 슬롯이 있으면 장면 제목을 유지한다(419차 3-6) */
  hasSceneImage?: boolean;
  /** 422차 — 제품 높이(cm) 입력이 있는지. 크기·휴대 문구의 이미지+글 카드는 이것이 있을 때만 손에 든 컷을 허용한다(없으면 사진 없이 글만) */
  hasSizeInfo?: boolean;
  enabled?: boolean;
};
export type PhotoMatchResult = { sections: DetailSection[]; changes: string[] };

const maxUses = IMAGE_SOURCE_CAP.maxUses;

function metaOf(ctx: PhotoMatchContext, i: number): PhotoMeta {
  return { role: ctx.roles?.[i], origin: ctx.origins?.[i], tags: ctx.tags?.[i] };
}

/** 1:1로 섹션을 바꿔 돌려준다(순서·개수 불변 — sourceIndexes가 그대로 맞는다) */
export function matchPhotosToText(sections: DetailSection[], imageCount: number, ctx: PhotoMatchContext): PhotoMatchResult {
  if (!beautyStyleOn(ctx.category, ctx.enabled) || !ctx.tags || ctx.tags.every((t) => !t?.length)) return { sections, changes: [] };
  const changes: string[] = [];
  const kindsOf = (i: number) => photoKinds(metaOf(ctx, i));
  const uses = new Array<number>(imageCount).fill(0);
  for (const s of sections) for (const i of sectionImageIndexes(s)) if (i >= 0 && i < imageCount) uses[i] = (uses[i] ?? 0) + 1;
  /** need를 채우는 사진 중 사용 횟수가 상한 미만인 것(적게 쓴 것 → 앞 번호). 히어로(0번)·확대/효과 복제본은 후보에서 뺀다 */
  const pick = (need: TextNeed, avoid: readonly number[]): number | null => {
    let best: number | null = null;
    for (let i = 1; i < imageCount; i += 1) {
      if (avoid.includes(i) || (uses[i] ?? 0) >= maxUses) continue;
      const k = kindsOf(i);
      if (satisfies(k, need) !== true) continue;
      // 손 요구에는 분사 컷보다 순수 손에 든 컷을, 분사 요구에는 분사 컷을 먼저
      const penalty = need === "hand" && k.has("spray") ? 1 : 0;
      const score = (uses[i] ?? 0) * 10 + penalty * 5 + i / 100;
      const bestScore = best == null ? Infinity : (uses[best] ?? 0) * 10 + (need === "hand" && kindsOf(best).has("spray") ? 5 : 0) + best / 100;
      if (score < bestScore) best = i;
    }
    return best;
  };

  const out = sections.map((s, si) => {
    // ── 갤러리: 장면·손·상자 제목이면 사진 종류를 본다 ──
    if (s.type === "gallery") {
      const need = textNeed(s.heading);
      if (!need) return s;
      const verdicts = s.imageIndexes.map((i) => satisfies(kindsOf(i), need));
      if (verdicts.some((v) => v === true) || verdicts.every((v) => v === null)) return s; // 맞는 사진이 있거나 정보가 없으면 그대로
      if (need === "scene" && ctx.hasSceneImage) return s;
      if (need !== "scene") {
        const swapped: number[] = [];
        for (let k = 0; k < s.imageIndexes.length; k += 1) {
          const alt = pick(need, swapped);
          if (alt != null) swapped.push(alt);
        }
        if (swapped.length >= 2) {
          for (const i of swapped) uses[i] = (uses[i] ?? 0) + 1;
          changes.push(`#${si} gallery "${s.heading}": ${need} 요구 → 사진 ${s.imageIndexes.join(",")} 대신 ${swapped.join(",")}`);
          return { ...s, imageIndexes: swapped } as GallerySection;
        }
      }
      changes.push(`#${si} gallery "${s.heading}": ${need} 요구에 맞는 사진 없음 → 제목을 "${NEUTRAL_HEADING.gallery}"로`);
      return { ...s, heading: NEUTRAL_HEADING.gallery } as GallerySection;
    }
    // ── 이미지+글: 썸네일·사진이 글 의미와 맞는지 ──
    if (s.type === "image_text" && typeof s.imageIndex === "number" && s.layout !== "text_only" && s.layout !== "circle-pair" && s.layout !== "circle-solo" && s.layout !== "annotated") {
      const need = textNeed(s.heading, s.body);
      if (!need) return s;
      // 422차: 크기·휴대 문구는 제품 높이 입력이 없으면 손에 든 컷을 붙이지 않는다(맞든 틀리든 글만)
      const carryWithoutSize = need === "hand" && isCarryText(s.heading, s.body) && ctx.hasSizeInfo !== true && satisfies(kindsOf(s.imageIndex), need) !== null;
      const ok = carryWithoutSize ? false : satisfies(kindsOf(s.imageIndex), need);
      if (ok !== false) return s;
      const alt = need === "scene" || carryWithoutSize ? null : pick(need, [s.imageIndex]);
      uses[s.imageIndex] = Math.max(0, (uses[s.imageIndex] ?? 0) - 1);
      if (alt != null) {
        uses[alt] = (uses[alt] ?? 0) + 1;
        changes.push(`#${si} ${s.slot} "${s.heading}": ${need} 요구 → 사진 ${s.imageIndex} 대신 ${alt}`);
        return { ...s, imageIndex: alt };
      }
      changes.push(`#${si} ${s.slot} "${s.heading}": ${need} 요구에 맞는 사진 없음 → 사진 빼고 글만`);
      return { ...s, layout: "text_only" as const };
    }
    return s;
  });
  return { sections: out, changes };
}

/**
 * 구성(상자·본품) 갤러리 — 상자 컷이 있고 아직 어느 섹션에서도 상자 컷을 쓰지 않을 때만, 제품 정보(spec_table) 앞에 한 장 둔다.
 * 새 문구 없이 고정 제목("구성")과 사진만. 삽입 위치의 원본 인덱스는 앞 섹션 것을 그대로 쓴다(표시 전용 — 편집 모드에서는 부르지 않는다).
 */
export function insertCompositionGallery(
  sections: DetailSection[],
  sourceIndexes: number[],
  imageCount: number,
  ctx: PhotoMatchContext,
): { sections: DetailSection[]; sourceIndexes: number[]; changes: string[] } {
  const none = { sections, sourceIndexes, changes: [] as string[] };
  if (!beautyStyleOn(ctx.category, ctx.enabled) || !ctx.tags || ctx.tags.every((t) => !t?.length)) return none;
  const used = new Array<number>(imageCount).fill(0);
  for (const s of sections) for (const i of sectionImageIndexes(s)) if (i >= 0 && i < imageCount) used[i] = (used[i] ?? 0) + 1;
  const boxes: number[] = [];
  for (let i = 1; i < imageCount; i += 1) if (photoKinds(metaOf(ctx, i)).has("box")) boxes.push(i);
  if (boxes.length === 0) return none;
  // 이미 상자 컷을 보여 주는 섹션이 있으면 새로 만들지 않는다
  if (boxes.some((i) => (used[i] ?? 0) > 0)) return none;
  const free = boxes.filter((i) => (used[i] ?? 0) < maxUses).slice(0, 2);
  if (free.length === 0) return none;
  const at = sections.findIndex((s) => s.type === "spec_table");
  if (at <= 0) return none;
  const gallery: GallerySection = { type: "gallery", slot: "composition", heading: NEUTRAL_HEADING.composition, imageIndexes: free };
  const nextSections = [...sections.slice(0, at), gallery, ...sections.slice(at)];
  const nextSources = [...sourceIndexes.slice(0, at), sourceIndexes[at - 1] ?? 0, ...sourceIndexes.slice(at)];
  return { sections: nextSections, sourceIndexes: nextSources, changes: [`구성 갤러리 추가: 상자 컷 ${free.join(",")} (spec_table 앞)`] };
}
