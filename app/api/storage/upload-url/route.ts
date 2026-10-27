import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStorage, StorageConfigError } from "@/lib/storage";
import { isAllowedUploadType, isOwnPath, MAX_UPLOAD_BYTES } from "@/lib/storage/policy";

/**
 * 459차 — 브라우저 직접 업로드용 서명 PUT 주소 발급(r2 모드 전용; supabase 모드에서는 409로 기존 클라이언트 업로드를 쓰게 한다).
 * 보안: 로그인 필수 · 경로는 `<userId>/` 접두사만 허용(다른 사용자·경로 탈출 거절) · 허용 형식·10MB 상한 · 서명은 Content-Type·Content-Length를 묶고 5분 뒤 만료 ·
 * 비밀키는 서버에만(응답에는 서명된 주소와 공개 주소만). 사용량 보호(usage_guard)는 유료 호출 한도용이라 여기에는 걸지 않는다 — 크기 상한과 인증이 방어선.
 * 오류 문구는 기존 것만 쓴다("로그인이 필요합니다."·"잘못된 요청 형식입니다.").
 */
const BAD = { error: "잘못된 요청 형식입니다." };

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { path?: unknown; contentType?: unknown; size?: unknown } | null;
    if (!body || typeof body.contentType !== "string" || typeof body.size !== "number") return NextResponse.json(BAD, { status: 400 });
    const { contentType, size } = body;
    if (!isAllowedUploadType(contentType) || !Number.isInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) return NextResponse.json(BAD, { status: 400 });

    // 경로: 클라이언트가 보냈다면 본인 접두사 검증, 없으면 서버가 만든다
    let path: string;
    if (typeof body.path === "string" && body.path) {
      if (!isOwnPath(body.path, user.id)) return NextResponse.json(BAD, { status: 403 });
      path = body.path;
    } else {
      path = `${user.id}/${Date.now()}-${crypto.randomUUID()}`;
    }

    const target = await getStorage(supabase).createUploadTarget({ path, contentType, size });
    if (!target) return NextResponse.json({ mode: "supabase" }, { status: 409 });
    return NextResponse.json(target);
  } catch (e) {
    if (e instanceof StorageConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    console.error("[storage/upload-url]", e instanceof Error ? e.message : String(e));
    return NextResponse.json(BAD, { status: 500 });
  }
}
