import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStorage, StorageConfigError } from "@/lib/storage";
import { MSG_BAD, planRemove } from "@/lib/storage/validate";

/** 459차 — 브라우저 직접 업로드의 롤백 삭제(r2 모드). 로그인 필수·본인 접두사 경로만·한 번에 20개까지. 다른 사용자의 경로가 하나라도 있으면 전부 거절 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const plan = planRemove(user?.id ?? null, await request.json().catch(() => null));
    if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });
    const { error } = await getStorage(supabase).removeObjects(plan.paths);
    if (error) return NextResponse.json({ error: MSG_BAD }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StorageConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ error: MSG_BAD }, { status: 500 });
  }
}
