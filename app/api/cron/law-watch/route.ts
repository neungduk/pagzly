import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { runLawWatch516, type LawWatchStore } from "@/lib/law-watch/run";
import type { LawWatchEventInsert, SnapshotRow } from "@/lib/law-watch/types";

/**
 * 516 — 법령 변경 감시 크론.
 * 인증: Authorization Bearer CRON_SECRET (billing/renew 와 동일).
 * 응답: 건수 요약만 (법령 본문·OC 금지).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.LAW_OC?.trim()) {
    return NextResponse.json({ ok: false, reason: "no_oc" }, { status: 200 });
  }

  try {
    const supabase = createServiceRoleClient();
    const store: LawWatchStore = {
      loadSnapshots: async () => {
        const { data, error } = await supabase.from("law_watch_snapshots").select("*");
        if (error) throw new Error("snapshot_load_failed");
        return (data ?? []) as SnapshotRow[];
      },
      upsertSnapshot: async (row: SnapshotRow) => {
        const { error } = await supabase.from("law_watch_snapshots").upsert(
          {
            key: row.key,
            name: row.name,
            ident: row.ident,
            promulgated_at: row.promulgated_at,
            effective_at: row.effective_at,
            status: row.status,
            revision_kind: row.revision_kind,
            meta_hash: row.meta_hash,
            last_checked_at: row.last_checked_at,
            last_changed_at: row.last_changed_at,
          },
          { onConflict: "key" },
        );
        if (error) throw new Error("snapshot_upsert_failed");
      },
      insertEvent: async (ev: LawWatchEventInsert) => {
        const { error } = await supabase.from("law_watch_events").insert({
          key: ev.key,
          kind: ev.kind,
          before: ev.before,
          after: ev.after,
          detected_at: ev.detected_at,
        });
        if (error) throw new Error("event_insert_failed");
      },
    };

    const summary = await runLawWatch516({ store });
    return NextResponse.json({
      ok: true,
      checked: summary.checked,
      baseline: summary.baseline,
      unchanged: summary.unchanged,
      changed: summary.changed,
      upcoming: summary.upcoming,
      missing: summary.missing,
      errors: summary.errors,
      skipped: summary.skipped,
    });
  } catch {
    console.error("[law-watch] cron failed");
    return NextResponse.json({ ok: false, error: "law_watch_failed" }, { status: 500 });
  }
}
