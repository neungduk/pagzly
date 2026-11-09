/**
 * 495 — 내 검수 결과 목록.
 */
import { NextResponse } from "next/server";
import { ERR_LOGIN_EXPIRED_495, ERR_SERVER_495 } from "@/lib/label-check/member-constants";
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
      return NextResponse.json({ error: ERR_LOGIN_EXPIRED_495 }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("label_check_runs")
      .select("id, market, product_name, summary, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.warn("[label-check-runs] list-failed");
      return NextResponse.json({ error: ERR_SERVER_495 }, { status: 500 });
    }
    return NextResponse.json({ runs: data || [] });
  } catch {
    return NextResponse.json({ error: ERR_SERVER_495 }, { status: 500 });
  }
}
