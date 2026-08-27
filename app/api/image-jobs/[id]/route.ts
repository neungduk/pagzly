import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGenerationStatus } from "@/lib/image-router/jobs/async-generation-service";

type RouteParams = { params: Promise<{ id: string }> };

/** @deprecated — GET /api/generations/:id 사용 */
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
      return NextResponse.json({ error: "job을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ job: status, result: status });
  } catch (error) {
    console.error("[image-jobs]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "job 조회 실패" },
      { status: 500 },
    );
  }
}
