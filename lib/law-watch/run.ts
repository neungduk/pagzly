import { filterExactName, searchLaw, type LawFetchFn } from "./client";
import { detectLawChange516 } from "./detect";
import { getLawWatchList516 } from "./watch-list";
import type {
  LawMeta,
  LawWatchEventInsert,
  LawWatchItem,
  SnapshotRow,
} from "./types";

export type LawWatchStore = {
  loadSnapshots: () => Promise<SnapshotRow[]>;
  upsertSnapshot: (row: SnapshotRow) => Promise<void>;
  insertEvent: (ev: LawWatchEventInsert) => Promise<void>;
};

export type LawWatchRunSummary = {
  checked: number;
  baseline: number;
  unchanged: number;
  changed: number;
  upcoming: number;
  missing: number;
  errors: number;
  skipped: number;
};

export type RunLawWatchOpts = {
  store: LawWatchStore;
  fetchFn?: LawFetchFn;
  items?: LawWatchItem[];
  now?: Date;
  /** 테스트용 OC. 미지정 시 env */
  oc?: string;
  search?: (item: LawWatchItem) => Promise<LawMeta | null | { error: true }>;
};

export async function runLawWatch516(
  opts: RunLawWatchOpts,
): Promise<LawWatchRunSummary> {
  const items = opts.items ?? getLawWatchList516();
  const nowIso = (opts.now ?? new Date()).toISOString();
  const prevRows = await opts.store.loadSnapshots();
  const prevByKey = new Map(prevRows.map((r) => [r.key, r]));

  const summary: LawWatchRunSummary = {
    checked: 0,
    baseline: 0,
    unchanged: 0,
    changed: 0,
    upcoming: 0,
    missing: 0,
    errors: 0,
    skipped: 0,
  };

  for (const item of items) {
    let meta: LawMeta | null = null;
    let fetchFailed = false;

    if (opts.search) {
      const r = await opts.search(item);
      if (r && typeof r === "object" && "error" in r) {
        fetchFailed = true;
      } else {
        meta = r;
      }
    } else {
      const res = await searchLaw({
        target: item.target,
        query: item.name,
        fetchFn: opts.fetchFn,
        oc: opts.oc,
      });
      if (!res.ok) {
        fetchFailed = true;
      } else {
        const exact = filterExactName(res.items, item.name);
        meta = exact[0] ?? null;
      }
    }

    // 실패 시 이전 스냅샷 유지 · last_checked_at 미갱신
    if (fetchFailed) {
      summary.errors += 1;
      continue;
    }

    summary.checked += 1;
    const prev = prevByKey.get(item.key) ?? null;
    const det = detectLawChange516({ item, prev, meta, nowIso });

    if (det.action === "skip") {
      summary.skipped += 1;
      continue;
    }

    if (det.snapshot) {
      await opts.store.upsertSnapshot(det.snapshot);
      prevByKey.set(det.snapshot.key, det.snapshot);
    }

    if (det.event) {
      await opts.store.insertEvent(det.event);
      if (det.event.kind === "changed") {
        summary.changed += 1;
        console.warn(`[law-watch] changed key=${det.event.key}`);
      } else if (det.event.kind === "upcoming") {
        summary.upcoming += 1;
        console.warn(`[law-watch] upcoming key=${det.event.key}`);
      } else if (det.event.kind === "missing") {
        summary.missing += 1;
        console.warn(`[law-watch] missing key=${det.event.key}`);
      }
    } else if (det.action === "baseline") {
      summary.baseline += 1;
    } else if (det.action === "unchanged") {
      summary.unchanged += 1;
    }
  }

  return summary;
}
