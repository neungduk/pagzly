/** `.env.local`의 `TEST_MODE=true` — 저비용 테스트 파이프라인 */
export function isTestMode(): boolean {
  return process.env.TEST_MODE === "true";
}
