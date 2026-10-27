import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStorage, StorageConfigError } from "@/lib/storage";
import { MSG_BAD, planUpload } from "@/lib/storage/validate";
import { createUploadLimiter, uploadRateGate } from "@/lib/storage/upload-rate";

// 460차: 사용자별 시간당·일일 발급 한도(상수는 lib/storage/policy.ts). 인메모리라 서버리스 인스턴스별 1차 완충
const limiter = createUploadLimiter();

/**
 * 459차 — 브라우저 직접 업로드용 서명 PUT 주소 발급(r2 모드 전용; supabase 모드에서는 409로 기존 클라이언트 업로드를 쓰게 한다).
 * 보안: 로그인 필수 · 경로는 `<userId>/` 접두사만 허용(다른 사용자·경로 탈출 거절) · 허용 형식·10MB 상한 · 서명은 Content-Type·Content-Length를 묶고 5분 뒤 만료 ·
 * 비밀키는 서버에만(응답에는 서명된 주소와 공개 주소만). usage_guard 는 DB 함수 기반 비용 한도라 시간 창 제한이 없어 쓰지 않고(마이그레이션 금지), 사용자별 시간당·일일 발급 한도를 인메모리로 둔다(초과 429).
 * 오류 문구는 기존 것만 쓴다("로그인이 필요합니다."·"잘못된 요청 형식입니다.").
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json().catch(() => null);
    const plan = planUpload(user?.id ?? null, body);
    if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });
    const storage = getStorage(supabase);
    if (storage.name === "supabase") return NextResponse.json({ mode: "supabase" }, { status: 409 });
    const limited = uploadRateGate(limiter, user!.id);
    if (limited) return NextResponse.json(limited.body, { status: limited.status, headers: { "Retry-After": String(limited.retryAfterSec) } });
    const target = await storage.createUploadTarget({ path: plan.path, contentType: plan.contentType, size: plan.size });
    if (!target) return NextResponse.json({ mode: "supabase" }, { status: 409 });
    return NextResponse.json(target);
  } catch (e) {
    if (e instanceof StorageConfigError) return NextResponse.json({ error: e.message }, { status: 500 });
    console.error("[storage/upload-url]", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: MSG_BAD }, { status: 500 });
  }
}
