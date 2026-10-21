/**
 * 409차 — 히어로 캡션 변형(caption-below / caption-above)의 공용 토큰.
 * 사진 위에 글자·그라데이션을 얹지 않고, 사진 블록과 글 블록을 위아래로 나눈다. 라이브·export가 같은 숫자를 쓴다.
 * 새 문구는 없다 — 브랜드 라벨·배지·제목·부제는 지금 히어로에 있는 문구를 다른 자리에 놓을 뿐이다.
 */
import type { CategoryTheme } from "@/lib/category-theme";
import type { HeroVariant } from "@/lib/style-packs";
import { BEAUTY_STYLE_ENABLED, beautyStyleOn } from "@/lib/beauty-style";

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

/**
 * 419차 3-4 — 뷰티 히어로: 사진 위에 글자를 얹는 classic(bleed-bottom)은 컨테이너가 화면 높이(85svh)라 정사각 원본이 1.85배까지 확대돼
 * 병 윗부분(캡)이 잘렸다(418차). 뷰티는 사진을 1:1로 통째로 보여 주고 글은 아래 띠(caption-below)로 옮긴다.
 *  - photoRatio 1:1 → 정사각 원본은 확대 0(제품 전체 + 원본이 가진 여백 그대로), 3:4·4:3 원본도 최대 4/3배.
 *  - maxZoom: 이 변형이 만드는 최대 확대율(원본 짧은 변 대비). 회귀가 비율에서 계산한 값과 같은지 본다.
 *  - 제품 영역 좌표(감지 결과)는 세션에 저장돼 있지 않아 상하 여유(8~12%) 확장은 하지 못했다 — 보고서 "남은 문제".
 */
export const BEAUTY_HERO = { photoRatio: "1 / 1", photoPosition: "50% 50%", maxZoom: 4 / 3 } as const;

/** 뷰티 + flag on + 사진 있는 classic 히어로(bleed-bottom)면 caption-below로, 그 외는 그대로 */
export function beautyHeroVariant(variant: HeroVariant, category: string | undefined | null, enabled: boolean = BEAUTY_STYLE_ENABLED): HeroVariant {
  return variant === "bleed-bottom" && beautyStyleOn(category, enabled) ? "caption-below" : variant;
}

/**
 * 428차 2-5 — product-stage 히어로(디자인 V2, 뷰티): 사진 한 장을 풀블리드로 깔지 않고, 은은한 그라데이션 면(stage) 위에 제품 사진을 크게(화면 폭 60~70%) 놓고
 * 하단 그림자를 약하게 준다. 글자는 사진 위에 없다(제목·부제는 아래 캡션 띠 그대로). 새 호출·새 이미지 없음 — 세션의 히어로 사진과 theme 색만 쓴다.
 * 저장 세션에는 제품 컷아웃(투명 PNG)이 보존돼 있지 않다(스튜디오 합성 완성본만 저장). 그래서 컷아웃 대신 히어로 사진 전체를 "카드"로 올린다.
 * 사진이 없으면(또는 flag off·뷰티 아님) 기존 caption-below로 폴백한다. 후보: card(68%·둥근 사각) · wide(82%) · disc(60%·원형 크롭).
 */
export type HeroStageVariant = "card" | "wide" | "disc";
export const HERO_STAGE_VARIANTS: readonly HeroStageVariant[] = ["card", "wide", "disc"];
/**
 * 기본 **끔**(사람 결정 대기): 저장 세션에 제품 컷아웃이 없어 사진 카드로 올리는데, 428차 눈 검수에서 풀블리드 1:1 히어로보다 첫 인상이 약했다(review/428-verify/stage-*.png).
 * NEXT_PUBLIC_HERO_STAGE=on 으로 서버를 시작하면 켜진다. 컷아웃이 보존되면(다음 라운드 데이터 과제) 기본 켬을 다시 검토한다.
 */
export const HERO_STAGE_ENABLED = process.env.NEXT_PUBLIC_HERO_STAGE === "on";
const envVariant = process.env.NEXT_PUBLIC_HERO_STAGE_VARIANT as HeroStageVariant | undefined;
export const HERO_STAGE_VARIANT: HeroStageVariant = envVariant && HERO_STAGE_VARIANTS.includes(envVariant) ? envVariant : "card";
/** 카드 폭(%) — 회귀가 60~70(card·disc) 범위를 본다. wide는 비교 후보 */
export const HERO_STAGE_WIDTH_PCT: Record<HeroStageVariant, number> = { card: 68, wide: 82, disc: 62 };

/** 뷰티 + V2 + flag + 히어로 사진이 있을 때만 stage */
export function heroStageOn(category: string | undefined | null, hasPhoto: boolean, v2On: boolean, enabled: boolean = HERO_STAGE_ENABLED): boolean {
  return enabled && v2On && hasPhoto && category === "화장품/뷰티";
}

/** stage CSS(라이브·export 공용). scope = `[data-pz-v2]` 또는 `.pagzly-wrap` */
export function heroStageCss(scope: string, tintTop: string, tintBottom: string): string {
  const S = `${scope} [data-hero-stage]`;
  const w = (v: HeroStageVariant) => `${HERO_STAGE_WIDTH_PCT[v]}%`;
  return (
    `${S}{display:block;background:linear-gradient(180deg,${tintTop} 0%,${tintBottom} 100%);padding:32px 0 20px;box-sizing:border-box}` +
    `${S} [data-hero-stage-card]{position:relative;width:${w("card")};margin:0 auto;aspect-ratio:1/1;overflow:hidden;border-radius:22px;box-shadow:0 22px 34px -18px rgba(27,27,24,0.34)}` +
    `${S}[data-hero-stage="wide"] [data-hero-stage-card]{width:${w("wide")};border-radius:18px}` +
    `${S}[data-hero-stage="disc"] [data-hero-stage-card]{width:${w("disc")};border-radius:9999px;box-shadow:0 22px 34px -18px rgba(27,27,24,0.34),0 0 0 6px rgba(255,255,255,0.7)}`
  );
}
