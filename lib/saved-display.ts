/**
 * 424차 1-3 — 저장·재불러오기 정합성. DB에서 다시 불러온 결과 화면에는 infoBackdrops·sceneImages·스타일 팩이 없어 코드 배경으로 보였다(417·422차 한계).
 * 스키마 변경 없이 products.photo_cost_breakdown(jsonb)의 `display` 키에 표시 상태를 함께 저장·복원한다.
 *  - 저장: /api/generate가 최종 저장할 때, 결과 화면 PATCH가 저장·토글할 때 withDisplayState로 합친다.
 *  - 복원: 결과 화면이 행을 읽을 때 displayStateOf로 꺼내 infoBackdrops·sceneImages·sceneImagesOn·stylePackId를 채운다.
 *  - 값은 항상 정규화(https 주소만, 알려진 구간·슬롯 키만)해서 쓰고 읽는다. 비용 칸(숫자)은 건드리지 않는다.
 * 전용 컬럼이 아니라 비용 JSON에 얹은 것이므로 장기적으로는 products.display jsonb 컬럼 마이그레이션을 권한다(보고서 SQL 초안).
 */
import { safeBackdropUrl, type InfoBackdropMap } from "@/lib/info-backdrop";
import { normalizeSceneImages, type SceneImageMap } from "@/lib/scene-images";
import { normalizeComparisonRows, type ComparisonRow } from "@/lib/comparison-input";
import type { PhotoCostBreakdown } from "@/lib/types/generate";

export type DisplayState = {
  infoBackdrops?: InfoBackdropMap;
  sceneImages?: SceneImageMap;
  /** 판매자가 연출 이미지(AI 생성)를 넣기로 켰는지(기본 꺼짐) */
  sceneImagesOn?: boolean;
  stylePackId?: string;
  /** 427차 — 판매자가 입력한 비교 행(있을 때만 비교표가 나온다). 재불러오기 후에도 같은 비교표가 되도록 함께 저장 */
  comparisonRows?: ComparisonRow[];
};

const INFO_ZONES = ["steps", "points", "stat", "compare", "care"] as const;
const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** 알 수 없는 값은 버리고 읽을 수 있는 것만 남긴다. 아무것도 없으면 undefined */
export function normalizeDisplayState(raw: unknown): DisplayState | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: DisplayState = {};
  if (o.infoBackdrops && typeof o.infoBackdrops === "object") {
    const m: Record<string, string> = {};
    for (const z of INFO_ZONES) {
      const u = safeBackdropUrl((o.infoBackdrops as Record<string, unknown>)[z] as string | undefined);
      if (u) m[z] = u;
    }
    if (Object.keys(m).length > 0) out.infoBackdrops = m as InfoBackdropMap;
  }
  const scenes = normalizeSceneImages(o.sceneImages);
  if (Object.keys(scenes).length > 0) out.sceneImages = scenes;
  if (typeof o.sceneImagesOn === "boolean") out.sceneImagesOn = o.sceneImagesOn;
  if (typeof o.stylePackId === "string" && PACK_ID_RE.test(o.stylePackId)) out.stylePackId = o.stylePackId;
  const rows = normalizeComparisonRows(o.comparisonRows);
  if (rows.length > 0) out.comparisonRows = rows;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 비용 JSON에서 표시 상태를 꺼낸다(없거나 깨졌으면 undefined) */
export function displayStateOf(breakdown: unknown): DisplayState | undefined {
  if (!breakdown || typeof breakdown !== "object") return undefined;
  return normalizeDisplayState((breakdown as { display?: unknown }).display);
}

/**
 * 비용 JSON에 표시 상태를 합친다. next의 키만 덮어쓰고(없는 키는 기존 값 유지), 정규화 후 비어 있으면 display 키를 만들지 않는다.
 * 숫자 칸은 그대로 복사한다.
 */
export function withDisplayState(breakdown: PhotoCostBreakdown | undefined | null, next: DisplayState | undefined): PhotoCostBreakdown {
  const base: PhotoCostBreakdown = { ...(breakdown ?? {}) };
  const prev = displayStateOf(base) ?? {};
  const merged = normalizeDisplayState({ ...prev, ...stripUndefined(next ?? {}) });
  if (merged) base.display = merged;
  else delete base.display;
  return base;
}

const stripUndefined = <T extends Record<string, unknown>>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
