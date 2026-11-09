/**
 * 495 — 내 검수 결과 단건 조회·삭제(본인만, RLS).
 */
import { NextResponse } from "next/server";
import { ERR_LOGIN_EXPIRED_495, ERR_SERVER_495 } from "@/lib/label-check/member-constants";
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
      return NextResponse.json({ error: ERR_LOGIN_EXPIRED_495 }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("label_check_runs")
      .select("id, market, product_name, options, summary, findings, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[label-check-runs] get-failed");
      return NextResponse.json({ error: ERR_SERVER_495 }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "결과를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ run: data });
  } catch {
    return NextResponse.json({ error: ERR_SERVER_495 }, { status: 500 });
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
      return NextResponse.json({ error: ERR_LOGIN_EXPIRED_495 }, { status: 401 });
    }

    const { error, count } = await supabase
      .from("label_check_runs")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.warn("[label-check-runs] delete-failed");
      return NextResponse.json({ error: ERR_SERVER_495 }, { status: 500 });
    }
    if (!count) {
      return NextResponse.json({ error: "결과를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: ERR_SERVER_495 }, { status: 500 });
  }
}
