/**
 * 495/498 — 내 검수 결과 목록.
 */
import { labelCheckErrorResponse } from "@/lib/label-check/api-errors";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return labelCheckErrorResponse("LOGIN", 401);
    }

    const { data, error } = await supabase
      .from("label_check_runs")
      .select("id, market, product_name, summary, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.warn("[label-check-runs] list-failed");
      return labelCheckErrorResponse("SERVER", 500);
    }
    return Response.json({ runs: data || [] });
  } catch {
    return labelCheckErrorResponse("SERVER", 500);
  }
}
