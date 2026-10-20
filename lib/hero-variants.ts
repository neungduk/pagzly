/**
 * 409차 — 히어로 캡션 변형(caption-below / caption-above)의 공용 토큰.
 * 사진 위에 글자·그라데이션을 얹지 않고, 사진 블록과 글 블록을 위아래로 나눈다. 라이브·export가 같은 숫자를 쓴다.
 * 새 문구는 없다 — 브랜드 라벨·배지·제목·부제는 지금 히어로에 있는 문구를 다른 자리에 놓을 뿐이다.
 */
import type { CategoryTheme } from "@/lib/category-theme";
import type { HeroVariant } from "@/lib/style-packs";

export const HERO_CAPTION = {
  /** 사진 블록 비율(4:5) — 지금 히어로와 같은 비율, 위쪽 기준으로 자르므로 얼굴·상체가 잘리지 않는다 */
  photoRatio: "4 / 5",
  /** 410차 — 사진이 첫 화면을 더 차지하도록 caption-below(에디토리얼)는 2:3(원본 전신 세로 사진 비율) */
  photoRatioBelow: "2 / 3",
  /** 410차 — 글 띠 세로 여백(px). 예전엔 카테고리 리듬 ×팩 배율(패션 62px)이라 띠가 첫 화면을 길게 차지했다 */
  padYPx: 36,
  photoPosition: "50% 0%",
  ink: "#1B1B18",
  subInk: "rgba(27,27,24,0.7)",
  ruleWidthPx: 40,
  ruleColor: "rgba(27,27,24,0.3)",
  ruleGapPx: 24,
  eyebrowSizePx: 11,
  eyebrowTracking: "0.22em",
  eyebrowGapPx: 16,
  titleLine: 1.1,
  subSizePx: 15,
  subLine: 1.7,
  subTopPx: 16,
  subMaxWidth: "36rem",
} as const;

/** 413차 — framed: 사진을 좌우 여백 안에 가는 테두리로 넣는다(풀블리드 아님). 글자는 사진 위에 없다 */
export const HERO_FRAME = {
  insetPx: 20,
  topPx: 20,
  borderPx: 1,
  borderColor: "rgba(27,27,24,0.18)",
} as const;

/** 413차 — split: 넓은 폭(≥640px)에서 사진 좌 / 글 우, 좁은 폭은 caption-below와 같은 위아래 */
/** 넓은 폭에서 글 칸이 절반이라 제목은 부제 크기(--pz-t-subtitle)를 쓴다(긴 제목이 3줄 이상 되지 않게, 413차 린트) */
export const HERO_SPLIT = { photoRatio: "4 / 5", minWidthPx: 640 } as const;

/** 415차 — full-photo: 모델 사진을 화면 가득(세로 3:4), 사진 위에는 글자 없음, 제목은 사진 아래 작은 캡션(부제 크기). 벤치마크(글자 없는 모델 사진) 구조 */
export const HERO_FULL = { photoRatio: "3 / 4" } as const;

export function heroCaptionRatio(variant: HeroVariant): string {
  if (variant === "full-photo") return HERO_FULL.photoRatio;
  if (variant === "framed") return HERO_CAPTION.photoRatio;
  if (variant === "split") return HERO_SPLIT.photoRatio;
  return variant === "caption-below" ? HERO_CAPTION.photoRatioBelow : HERO_CAPTION.photoRatio;
}


export function heroCaptionAlign(variant: HeroVariant): "center" | "left" {
  return variant === "caption-below" || variant === "framed" ? "center" : "left";
}

/** caption-below·framed·split = 중립 띠 색, caption-above = 흰 바탕 */
export function heroCaptionBackground(variant: HeroVariant, theme: Pick<CategoryTheme, "baseNeutral">): string {
  return variant === "caption-above" ? "#FFFFFF" : theme.baseNeutral;
}
