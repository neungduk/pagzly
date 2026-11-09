/**
 * 495/498 — 내 검수 결과 단건 조회·삭제(본인만, RLS).
 */
import { labelCheckErrorResponse } from "@/lib/label-check/api-errors";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return labelCheckErrorResponse("LOGIN", 401);
    }

    const { data, error } = await supabase
      .from("label_check_runs")
      .select("id, market, product_name, options, summary, findings, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[label-check-runs] get-failed");
      return labelCheckErrorResponse("SERVER", 500);
    }
    if (!data) {
      return labelCheckErrorResponse("NOT_FOUND", 404);
    }
    return Response.json({ run: data });
  } catch {
    return labelCheckErrorResponse("SERVER", 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return labelCheckErrorResponse("LOGIN", 401);
    }

    const { error, count } = await supabase
      .from("label_check_runs")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.warn("[label-check-runs] delete-failed");
      return labelCheckErrorResponse("SERVER", 500);
    }
    if (!count) {
      return labelCheckErrorResponse("NOT_FOUND", 404);
    }
    return Response.json({ ok: true });
  } catch {
    return labelCheckErrorResponse("SERVER", 500);
  }
}
