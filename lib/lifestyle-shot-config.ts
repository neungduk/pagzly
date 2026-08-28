import type { ImageQualityLevel, ImageResolution } from "@/lib/image-router/types";

/** 일상샷 생성 설정 — env로 원가 튜닝 */
export type LifestyleShotConfig = {
  enabled: boolean;
  maxCount: number;
  qualityLevel: ImageQualityLevel;
  resolution: ImageResolution;
  /** 이 장수 미만 업로드면 일상샷 생략 (스튜디오+원본만) */
  minUploadCount: number;
};

function parseIntEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

/**
 * 기본값은 원가 최적화:
 * - standard → Kontext PRODUCT_LIFESTYLE_EDIT (~$0.04/장)
 * - max 2장, 768px
 * - premium/Gemini(~$0.14/장)는 LIFESTYLE_SHOT_QUALITY=premium
 */
export function getLifestyleShotConfig(): LifestyleShotConfig {
  const enabledRaw = process.env.LIFESTYLE_SHOTS_ENABLED?.trim().toLowerCase();
  const enabled = enabledRaw !== "false" && enabledRaw !== "0";

  const qualityRaw = process.env.LIFESTYLE_SHOT_QUALITY?.trim().toLowerCase();
  const qualityLevel: ImageQualityLevel =
    qualityRaw === "premium" ? "premium" : "standard";

  const resRaw = process.env.LIFESTYLE_SHOT_RESOLUTION?.trim();
  const resolution: ImageResolution =
    resRaw === "512" || resRaw === "768" || resRaw === "1024" ? resRaw : "768";

  return {
    enabled,
    maxCount: parseIntEnv("LIFESTYLE_SHOT_MAX_COUNT", 2, 0, 3),
    qualityLevel,
    resolution,
    minUploadCount: parseIntEnv("LIFESTYLE_SHOT_MIN_UPLOADS", 3, 1, 10),
  };
}

/** 업로드 장수 + maxCount 캡으로 실제 생성 장수 */
export function countLifestyleShotsToGenerate(uploadCount: number, config?: LifestyleShotConfig): number {
  const cfg = config ?? getLifestyleShotConfig();
  if (!cfg.enabled || uploadCount < cfg.minUploadCount || cfg.maxCount <= 0) return 0;

  let desired: number;
  if (uploadCount >= 8) desired = 3;
  else if (uploadCount >= 5) desired = 2;
  else desired = 1;

  return Math.min(desired, cfg.maxCount);
}

/** 단가 추정 (USD) — pricing-config + 라우팅 규칙 근사 */
export function estimateLifestyleShotUnitCostUsd(config?: LifestyleShotConfig): number {
  const cfg = config ?? getLifestyleShotConfig();
  if (cfg.qualityLevel === "premium") {
    // Gemini premium: flat 0.08 + ~0.02 input MP + ~0.04 output MP @768-1024
    const mp = cfg.resolution === "512" ? 0.26 : cfg.resolution === "768" ? 0.59 : 1.05;
    return 0.08 + 0.02 * mp + 0.04 * mp;
  }
  // standard + PRODUCT_LIFESTYLE_EDIT → Kontext flat
  return 0.04;
}
