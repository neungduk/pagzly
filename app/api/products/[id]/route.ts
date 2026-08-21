import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DetailSection } from "@/lib/types/generate";

type UpdateProductBody = {
  sections?: DetailSection[];
  imageUrls?: string[];
};

/**
 * 상세페이지 결과 화면의 "직접 편집" 저장 버튼이 실제로 호출하는 엔드포인트.
 *
 * 기존에는 handleSave()가 sessionStorage에만 써서, 탭을 닫거나 "작업 내역"에서
 * 다시 열면 수정 전 AI 생성 결과로 되돌아가는 문제가 있었다. 이 라우트가
 * products 행(sections/image_urls)에 실제로 반영해 영구 저장되게 한다.
 *
 * RLS(20260812150000 마이그레이션의 "Users can update own products" 정책)가
 * auth.uid() = user_id 행만 update 되도록 이미 강제하므로, 아래 .eq("user_id", ...)는
 * 방어적 이중 체크 — 남의 상품이면 0행 매치라 에러로 처리된다.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: UpdateProductBody;
    try {
      body = (await request.json()) as UpdateProductBody;
    } catch {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (Array.isArray(body.sections)) {
      update.sections = body.sections;
    }
    if (Array.isArray(body.imageUrls)) {
      update.image_urls = body.imageUrls;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "저장할 내용이 없습니다." }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("products")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[products/update] error", error);
      return NextResponse.json({ error: `저장 실패: ${error.message}` }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json(
        { error: "해당 상품을 찾을 수 없거나 수정 권한이 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (error) {
    console.error("[products/update]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 },
    );
  }
}
