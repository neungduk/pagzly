import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStorage, StorageConfigError } from "@/lib/storage";
import { isOwnPath } from "@/lib/storage/policy";

/** 459차 — 브라우저 직접 업로드의 롤백 삭제(r2 모드). 로그인 필수·본인 접두사 경로만·한 번에 20개까지. 다른 사용자의 경로가 하나라도 있으면 전부 거절 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const body = (await request.json().catch(() => null)) as { paths?: unknown } | null;
    const paths = Array.isArray(body?.paths) ? (body!.paths as unknown[]) : null;
    if (!paths || paths.length === 0 || paths.length > 20 || !paths.every((p): p is string => typeof p === "string")) return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    if (!paths.every((p) => isOwnPath(p, user.id))) return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 403 });
    const { error } = await getStorage(supabase).removeObjects(paths);
    if (error) return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StorageConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 500 });
  }
}
