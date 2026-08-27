import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGenerationStatus } from "@/lib/image-router/jobs/async-generation-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const status = await getGenerationStatus({ jobId: id, userId: user.id });
    if (!status) {
      return NextResponse.json({ error: "generation job을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("[generations GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation 상태 조회 실패" },
      { status: 500 },
    );
  }
}
