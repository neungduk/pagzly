import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStorage, StorageConfigError } from "@/lib/storage";
import { MSG_BAD, planUpload } from "@/lib/storage/validate";

/**
 * 459차 — 브라우저 직접 업로드용 서명 PUT 주소 발급(r2 모드 전용; supabase 모드에서는 409로 기존 클라이언트 업로드를 쓰게 한다).
 * 보안: 로그인 필수 · 경로는 `<userId>/` 접두사만 허용(다른 사용자·경로 탈출 거절) · 허용 형식·10MB 상한 · 서명은 Content-Type·Content-Length를 묶고 5분 뒤 만료 ·
 * 비밀키는 서버에만(응답에는 서명된 주소와 공개 주소만). 사용량 보호(usage_guard)는 유료 호출 한도용이라 여기에는 걸지 않는다 — 크기 상한과 인증이 방어선.
 * 오류 문구는 기존 것만 쓴다("로그인이 필요합니다."·"잘못된 요청 형식입니다.").
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json().catch(() => null);
    const plan = planUpload(user?.id ?? null, body);
    if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });
    const target = await getStorage(supabase).createUploadTarget({ path: plan.path, contentType: plan.contentType, size: plan.size });
    if (!target) return NextResponse.json({ mode: "supabase" }, { status: 409 });
    return NextResponse.json(target);
  } catch (e) {
    if (e instanceof StorageConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    console.error("[storage/upload-url]", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: MSG_BAD }, { status: 500 });
  }
}
