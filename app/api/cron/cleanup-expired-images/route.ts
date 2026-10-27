import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStorage, StorageConfigError } from "@/lib/storage";
import { runExpiredCleanup, type ExpiredRow } from "@/lib/storage/expired-cleanup";

/**
 * 460차 — 만료 이미지 정리(서버). R2에서는 Supabase 엣지 함수가 R2 객체를 못 지우므로 이 라우트가 provider 경유로 지운다.
 * 인증은 /api/billing/renew 와 같은 방식: `Authorization: Bearer $CRON_SECRET` (없거나 다르면 401).
 * 기본 미등록 — vercel.json 에 넣는 방법과 엣지 cron 과의 순서는 docs/r2-setup.md. 로그에는 개수만 남긴다(경로·키 없음).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const supabase = createServiceRoleClient();
    const storage = getStorage(supabase);
    const result = await runExpiredCleanup({
      storage,
      listCandidates: async (cutoff, nowIso, limit) => {
        const { data, error } = await supabase
          .from("product_images")
          .select("id, storage_path, product_id, image_uploaded_at, protected_until")
          .is("product_id", null)
          .lt("image_uploaded_at", cutoff)
          .or(`protected_until.is.null,protected_until.lt."${nowIso}"`)
          .order("image_uploaded_at", { ascending: true })
          .limit(limit);
        return { rows: (data ?? []) as ExpiredRow[], error: error ? error.message : null };
      },
      deleteRows: async (ids) => {
        const { error } = await supabase.from("product_images").delete().in("id", ids);
        return { error: error ? error.message : null };
      },
    });
    if (!result.ok) console.error("[cron/cleanup-expired-images] partial failure", { selected: result.selected, deleted: result.deleted, failedChunks: result.failedChunks, rowDeleteErrors: result.rowDeleteErrors, error: result.error });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    if (e instanceof StorageConfigError) return NextResponse.json({ error: "storage_config", missing: e.missing }, { status: 500 });
    console.error("[cron/cleanup-expired-images] failed");
    return NextResponse.json({ error: "cleanup_failed" }, { status: 500 });
  }
}
