/**
 * 520 — 토스 Origin OCR 한도(웹 요청에는 영향 없음).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { allowedOrigin520 } from "@/lib/label-check/cors-520";

export function isTossRequest520(req: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(allowedOrigin520(req.headers.get("origin"), env));
}

/** 토스 익명(IP) 일일 한도. 기본 5 */
export function tossOcrPerIpDaily520(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.LABEL_TOSS_OCR_PER_IP_DAILY);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

/** 토스 전체 일일 합계 상한. 기본 300 */
export function tossOcrDailyMax520(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.LABEL_TOSS_OCR_DAILY_MAX);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300;
}

/**
 * 토스 일일 합계 소비. RPC 실패·마이그레이션 미적용 시 true(통과) + 경고.
 * false = 한도 초과.
 */
export async function tryConsumeTossDaily520(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any> | { rpc: Function },
  add: number,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const units = Number.isFinite(add) && add > 0 ? Math.floor(add) : 1;
  const max = tossOcrDailyMax520(env);
  try {
    const { data, error } = await supabase.rpc("label_toss_consume", {
      p_max: max,
      p_add: units,
    });
    if (error) {
      console.warn("[label-ocr] toss-daily-rpc-failed");
      return true;
    }
    return data === true;
  } catch {
    console.warn("[label-ocr] toss-daily-failed");
    return true;
  }
}
