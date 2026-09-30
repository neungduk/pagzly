/**
 * 최종 생성 완료 시 사용자 크레딧 차감 (credit_ledger reason="completion").
 * 회사 원가 집계(logAiCost 등)와는 무관 — 사용자에게 보이는 차감만 다룬다.
 *
 * 함수가 maxDuration에 강제 종료되면 이후 코드(catch/finally 포함)가 실행되지 않아
 * "차감 후 실패 시 환불"은 불가능하다. 그래서 차감은 저장이 끝난 뒤 응답 직전 한 번만 하고,
 * 시간 상한까지 여유가 margin보다 적으면 응답이 클라이언트에 닿지 못할 수 있으므로 차감하지 않는다.
 */

export const COMPLETION_CHARGE_DEADLINE_MARGIN_MS = 20_000;

export type DeductCreditsRpc = (
  fn: "deduct_credits",
  args: {
    p_user_id: string;
    p_amount: number;
    p_reason: "completion";
    p_reference_id: string;
  },
) => PromiseLike<{ error: unknown }>;

export type CompletionChargeResult =
  | { status: "charged"; elapsedMs: number }
  | { status: "skipped_deadline"; elapsedMs: number }
  | { status: "failed"; elapsedMs: number; error: unknown };

export async function chargeCompletionCredits(opts: {
  getRpc: () => DeductCreditsRpc;
  userId: string;
  amount: number;
  productId: string;
  requestStartedAt: number;
  maxDurationMs: number;
  marginMs?: number;
  now?: () => number;
}): Promise<CompletionChargeResult> {
  const now = opts.now ?? Date.now;
  const margin = opts.marginMs ?? COMPLETION_CHARGE_DEADLINE_MARGIN_MS;
  const elapsedMs = now() - opts.requestStartedAt;

  if (elapsedMs > opts.maxDurationMs - margin) {
    console.warn(
      `[generate] completion charge skipped — elapsed=${Math.round(elapsedMs / 1000)}s ` +
        `exceeds ${Math.round((opts.maxDurationMs - margin) / 1000)}s ` +
        `(user=${opts.userId} product=${opts.productId})`,
    );
    return { status: "skipped_deadline", elapsedMs };
  }

  try {
    const { error } = await opts.getRpc()("deduct_credits", {
      p_user_id: opts.userId,
      p_amount: opts.amount,
      p_reason: "completion",
      p_reference_id: opts.productId,
    });
    if (error) {
      console.error(
        `[generate] deduct_credits failed for user=${opts.userId} product=${opts.productId}:`,
        error,
      );
      return { status: "failed", elapsedMs, error };
    }
    return { status: "charged", elapsedMs };
  } catch (error) {
    console.error(
      `[generate] deduct_credits threw for user=${opts.userId} product=${opts.productId}:`,
      error,
    );
    return { status: "failed", elapsedMs, error };
  }
}
