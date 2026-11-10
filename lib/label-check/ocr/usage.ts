/**
 * 508 — 월 OCR 사용량(Supabase). 서버 service role만.
 * 서버리스 인스턴스 메모리 limiter는 약한 보호 — 월 합계가 본 보호장치.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ocrMonthlyLimit508 } from "@/lib/label-check/ocr/provider";

export function ocrPeriodKey508(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * 호출 전 units만큼 소비 시도. false면 한도 초과(Vision 호출 금지).
 * RPC `label_ocr_consume` — 마이그레이션 미적용 시 보수적으로 false.
 */
export async function consumeOcrUnits508(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any> | { rpc: Function },
  units: number,
  opts?: { period?: string; limit?: number },
): Promise<boolean> {
  if (units < 1) return true;
  const period = opts?.period ?? ocrPeriodKey508();
  const limit = opts?.limit ?? ocrMonthlyLimit508();
  try {
    const { data, error } = await supabase.rpc("label_ocr_consume", {
      p_period: period,
      p_units: units,
      p_limit: limit,
    });
    if (error) {
      console.warn("[label-ocr] consume-rpc-failed");
      return false;
    }
    return data === true;
  } catch {
    console.warn("[label-ocr] consume-failed");
    return false;
  }
}
