import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAsyncGenerationJob,
  dispatchGenerationJob,
} from "@/lib/image-router/jobs/async-generation-service";
import {
  assertImageJobStoreConfig,
  ImageJobStoreConfigError,
} from "@/lib/image-router/jobs/job-store-config";
import type { CreateGenerationRequest } from "@/lib/image-router/jobs/generation-api-types";
import { IMAGE_TASK_TYPES } from "@/lib/image-router/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = (await request.json()) as CreateGenerationRequest;

    if (!body.taskType || !IMAGE_TASK_TYPES.includes(body.taskType)) {
      return NextResponse.json({ error: "유효하지 않은 taskType입니다." }, { status: 400 });
    }
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "prompt가 필요합니다." }, { status: 400 });
    }

    try {
      assertImageJobStoreConfig({ requireWorker: true });
    } catch (err) {
      if (err instanceof ImageJobStoreConfigError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
      }
      throw err;
    }

    const created = await createAsyncGenerationJob({ userId: user.id, body });

    if (!created.duplicate) {
      dispatchGenerationJob(created.id);
    }

    return NextResponse.json(created, { status: created.duplicate ? 200 : 202 });
  } catch (error) {
    console.error("[generations POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation job 생성 실패" },
      { status: 500 },
    );
  }
}
