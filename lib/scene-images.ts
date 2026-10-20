/**
 * 419차 3-6 — 장면(합성) 이미지 슬롯. 생성 호출은 만들지 않는다(421차에서 모델 연결). 이 파일은 계산만 한다.
 *  - 슬롯: 세션 JSON의 `sceneImages`(슬롯 키 → {url, role:"scene", aiGenerated:true}) — DB 스키마 변경 없음(417차 infoBackdrops와 같은 방식).
 *  - 표시: 슬롯에 URL이 있으면 `scene_image` 섹션(표시 전용, 저장 안 됨)을 끼워 넣고 이미지 하단에 고정 고지 "연출 이미지(AI 생성)"를 항상 붙인다.
 *    슬롯이 비면 아무것도 끼우지 않는다(3-2의 중립 제목 폴백이 맡는다). 라이브·export가 같은 마크업.
 *  - 정책(임시): AI 피부 전후 이미지는 만들지 않는다(슬롯 키에 없음). 연출 이미지에는 효능·수치·성분 문구를 얹지 않는다.
 *  - 비용 상한 장치: 페이지당 최대 4장·$0.24(기본), 초과 슬롯은 폴백. 비용 기록은 photoCostBreakdown.sceneImages.
 */
import type { DetailSection } from "@/lib/types/generate";
import { BEAUTY_CATEGORY, beautyStyleOn } from "@/lib/beauty-style";
import { sectionImageIndexes } from "@/lib/image-source-cap";

// ── 슬롯 키(카테고리별 확장 가능한 구조) ──
export const BEAUTY_SCENE_SLOTS = ["use-person", "use-hand-mist", "scene-desk", "scene-bag", "scene-vanity"] as const;
export type BeautySceneSlot = (typeof BEAUTY_SCENE_SLOTS)[number];
/** 다른 카테고리는 이름만 예약(구현·호출 없음) */
export const RESERVED_SCENE_SLOTS: Record<string, readonly string[]> = {
  "전자제품": ["use-desk-device", "use-hand-device", "scene-bag-device"],
};
export const SCENE_NOTICE = "연출 이미지(AI 생성)";

export type SceneImage = { url: string; role: "scene"; aiGenerated: true };
export type SceneImageMap = Partial<Record<string, SceneImage>>;

/** https 주소만(CSS·HTML을 깰 문자 없음) */
export function safeSceneUrl(u: string | null | undefined): string | null {
  if (!u || u.length > 2000) return null;
  return /^https:\/\/[^\s"'()<>\\]+$/.test(u) ? u : null;
}

/** 읽을 수 있는 슬롯만 남긴다(잘못된 키·주소·aiGenerated 아님은 버림) */
export function normalizeSceneImages(raw: unknown): SceneImageMap {
  const out: SceneImageMap = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const o = v as { url?: unknown; role?: unknown; aiGenerated?: unknown } | null;
    const url = safeSceneUrl(typeof o?.url === "string" ? o.url : null);
    if (url && o?.role === "scene" && o?.aiGenerated === true && /^[a-z][a-z0-9-]{1,40}$/.test(k)) out[k] = { url, role: "scene", aiGenerated: true };
  }
  return out;
}

// ── 장수·비용 상한(417차 인포 배경과 같은 구조) ──
export const SCENE_MAX_COUNT = 4;
export const SCENE_COST_CAP_USD = 0.24;
/** 장당 보수적 단가 — 420차 모델 비교 뒤 실제 단가로 맞춘다 */
export const SCENE_UNIT_USD = 0.06;
export type ScenePlan = { slots: string[]; fallbacks: Array<{ slot: string; reason: "count" | "cost" | "unknown" }>; estimateUsd: number };

export function planSceneImages(requested: readonly string[], category: string | undefined | null = BEAUTY_CATEGORY): ScenePlan {
  const known = new Set<string>(category === BEAUTY_CATEGORY ? BEAUTY_SCENE_SLOTS : []);
  const slots: string[] = [];
  const fallbacks: ScenePlan["fallbacks"] = [];
  let spend = 0;
  for (const slot of [...new Set(requested)]) {
    if (!known.has(slot)) { fallbacks.push({ slot, reason: "unknown" }); continue; }
    if (slots.length >= SCENE_MAX_COUNT) { fallbacks.push({ slot, reason: "count" }); continue; }
    if (spend + SCENE_UNIT_USD > SCENE_COST_CAP_USD + 1e-9) { fallbacks.push({ slot, reason: "cost" }); continue; }
    slots.push(slot);
    spend += SCENE_UNIT_USD;
  }
  return { slots, fallbacks, estimateUsd: +spend.toFixed(4) };
}
/** photoCostBreakdown.sceneImages — 과금 가능 호출 수 × 단가 */
export const sceneImageCostUsd = (billedCalls: number): number => +(Math.max(0, billedCalls) * SCENE_UNIT_USD).toFixed(4);

// ── 프롬프트 빌더(호출 없음) ──
export type ScenePromptInput = {
  /** 영어 상품 종류(예: "facial mist bottle") — 호출부가 사전으로 정한다. 판매자 입력 원문은 넣지 않는다 */
  productKind?: string | null;
  /** 제품 주조색 영어 표현(예: "pale gold and black") */
  color?: string | null;
  /** 분위기 영어 표현(예: "fresh and dewy") */
  mood?: string | null;
  /** 타깃 입력(예: "20~30대 여성", "30~40대 여성", "남성") — 연령·성별만 읽는다 */
  target?: string | null;
};

export const SCENE_COMMON_DIRECTIVES =
  "keep the product label and logo exactly as in the reference, do not alter text, clean natural makeup, no celebrity likeness, no text overlay, no before and after, no skin close-up";

/** 타깃 문구에서 연령·성별만 읽어 영어 인물 묘사로(기본 20~30대 한국 여성) */
export function sceneModelDescription(target: string | null | undefined): string {
  const t = target ?? "";
  const man = /남성|남자/.test(t) && !/여성|여자|남녀/.test(t);
  const has = (d: string) => new RegExp(`(?<!\\d)${d}(?!\\d)`).test(t);
  const age = has("50") || (has("40") && !has("30")) ? "in her forties" : has("30") && has("40") ? "in her thirties to forties" : has("20") && has("30") ? "in her twenties to thirties" : has("30") ? "in her thirties" : has("20") ? "in her twenties" : "in her twenties to thirties";
  if (man) return `a Korean man ${age.replace("her", "his")}`;
  return `a Korean woman ${age}`;
}

export function buildScenePrompt(slot: BeautySceneSlot, input: ScenePromptInput): string {
  const product = (input.productKind ?? "").trim() || "skincare bottle";
  const color = input.color ? `, product in ${input.color}` : "";
  const mood = input.mood ? `, ${input.mood} mood` : "";
  const model = sceneModelDescription(input.target);
  const base: Record<BeautySceneSlot, string> = {
    "use-person": `${model} naturally using the ${product}, calm clean bathroom vanity, soft daylight, relaxed expression, waist-up framing`,
    "use-hand-mist": `close-up of a hand holding the ${product} spraying a fine mist, soft diffused light, shallow depth of field, face out of frame`,
    "scene-desk": `the ${product} on a tidy office desk beside a notebook and a cup, natural window light, lifestyle still life`,
    "scene-bag": `the ${product} beside an open tote bag on a light bench, travel-ready arrangement, soft daylight, lifestyle still life`,
    "scene-vanity": `the ${product} on a clean vanity table with a small mirror, soft light, minimal props, lifestyle still life`,
  };
  return `${base[slot]}${color}${mood}, ${SCENE_COMMON_DIRECTIVES}`;
}

// ── 표시: 슬롯 → scene_image 섹션을 알맞은 자리에 ──
/** 슬롯별 자리: use-person = 사용법 앞, use-hand-mist = 사용법 뒤, scene-* = 장면 제목 갤러리 자리(없으면 갤러리 뒤·퀵포인트 뒤) */
type Anchor = { before?: (s: DetailSection) => boolean; after?: (s: DetailSection) => boolean };
const isUsage = (s: DetailSection) => s.type === "usage_steps";
const isGallery = (s: DetailSection) => s.type === "gallery";
const ANCHORS: Record<BeautySceneSlot, Anchor> = {
  "use-person": { before: isUsage },
  "use-hand-mist": { after: isUsage },
  "scene-desk": { after: isGallery },
  "scene-bag": { after: isGallery },
  "scene-vanity": { after: isGallery },
};

/** 장면(scene-*)을 먼저 놓고 사용(use-*)을 나중에 — 같은 자리에 겹치면 장면 → 사용 순서 */
const PLACEMENT_ORDER: readonly BeautySceneSlot[] = ["scene-desk", "scene-bag", "scene-vanity", "use-person", "use-hand-mist"];

export function sceneSection(slot: string, url: string): DetailSection {
  return { type: "scene_image", slot: `scene-${slot}`, sceneSlot: slot, url } as unknown as DetailSection;
}

/**
 * 표시 전용 삽입(편집 모드 아님). 뷰티 + flag on + 슬롯에 URL이 있을 때만. 앵커가 없으면 그 슬롯은 넣지 않는다.
 * sourceIndexes에는 앞 섹션의 원본 인덱스를 복제한다(길이만 맞춘다).
 */
export function insertSceneSlots(
  sections: DetailSection[],
  sourceIndexes: number[],
  scenes: SceneImageMap | undefined,
  category: string | undefined | null,
  enabled?: boolean,
): { sections: DetailSection[]; sourceIndexes: number[]; inserted: string[] } {
  const none = { sections, sourceIndexes, inserted: [] as string[] };
  if (!scenes || !beautyStyleOn(category, enabled)) return none;
  const plan = planSceneImages(Object.keys(scenes), category);
  let secs = sections;
  let srcs = sourceIndexes;
  const inserted: string[] = [];
  // scene-* 는 장면 제목 갤러리(사진이 장면과 안 맞는 갤러리)가 있으면 그 자리를 대신한다
  for (const slot of PLACEMENT_ORDER) {
    if (!plan.slots.includes(slot)) continue;
    const url = safeSceneUrl(scenes[slot]?.url);
    if (!url) continue;
    const a = ANCHORS[slot];
    let at = -1;
    if (a.before) at = secs.findIndex(a.before);
    else if (a.after) {
      const i = secs.findIndex(a.after);
      // 같은 앵커 뒤에 이미 끼운 장면 섹션이 있으면 그 뒤에
      at = i < 0 ? -1 : (() => { let j = i + 1; while (secs[j]?.type === "scene_image") j += 1; return j; })();
    }
    if (at < 0) continue;
    secs = [...secs.slice(0, at), sceneSection(slot, url), ...secs.slice(at)];
    srcs = [...srcs.slice(0, at), srcs[Math.max(0, at - 1)] ?? 0, ...srcs.slice(at)];
    inserted.push(slot);
  }
  return { sections: secs, sourceIndexes: srcs, inserted };
}

/** 사진 번호를 쓰는 섹션 수(상한 점검용 — scene_image는 사진 번호를 쓰지 않는다) */
export const sceneSectionUsesNoIndex = (s: DetailSection): boolean => s.type === "scene_image" && sectionImageIndexes(s).length === 0;
