/** `.env.local`의 `FORCE_REGENERATE=true` — 디스크 캐시 무시, Replicate/Claude 재호출 */
export function isForceRegenerate(): boolean {
  return process.env.FORCE_REGENERATE === "true";
}

export function logForceRegenerateStatus(): void {
  if (isForceRegenerate()) {
    console.log(
      "[force-regenerate] FORCE_REGENERATE=true — section-backdrop / image-analysis 캐시 무시, Replicate 새 생성",
    );
  }
}
