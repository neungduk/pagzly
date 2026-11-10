import { createHash } from "node:crypto";
import type {
  EventKind,
  LawMeta,
  LawWatchEventInsert,
  LawWatchItem,
  SnapshotRow,
} from "./types";

export function metaHash516(meta: {
  ident: string;
  promulgatedAt: string | null;
  effectiveAt: string | null;
  status: string;
  revisionKind: string;
}): string {
  const payload = [
    meta.ident,
    meta.promulgatedAt ?? "",
    meta.effectiveAt ?? "",
    meta.status,
    meta.revisionKind,
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 32);
}

export function snapshotFromMeta516(
  item: LawWatchItem,
  meta: LawMeta,
  nowIso: string,
  prev?: SnapshotRow | null,
): SnapshotRow {
  const hash = metaHash516(meta);
  const changed =
    !prev ||
    prev.ident !== meta.ident ||
    prev.promulgated_at !== meta.promulgatedAt ||
    prev.effective_at !== meta.effectiveAt ||
    prev.status !== meta.status ||
    prev.revision_kind !== meta.revisionKind;
  return {
    key: item.key,
    name: item.name,
    ident: meta.ident,
    promulgated_at: meta.promulgatedAt,
    effective_at: meta.effectiveAt,
    status: meta.status,
    revision_kind: meta.revisionKind,
    meta_hash: hash,
    last_checked_at: nowIso,
    last_changed_at: changed ? nowIso : prev?.last_changed_at ?? nowIso,
  };
}

export type DetectResult =
  | { action: "baseline"; snapshot: SnapshotRow; event: null }
  | { action: "unchanged"; snapshot: SnapshotRow; event: null }
  | { action: "event"; snapshot: SnapshotRow; event: LawWatchEventInsert }
  | { action: "missing"; snapshot: SnapshotRow; event: LawWatchEventInsert }
  | { action: "skip"; snapshot: null; event: null };

function eventOf(
  key: string,
  kind: EventKind,
  before: unknown,
  after: unknown,
  nowIso: string,
): LawWatchEventInsert {
  return { key, kind, before, after, detected_at: nowIso };
}

/**
 * 기준선(이전 스냅샷 없음) → 이벤트 없음.
 * ident/공포/시행/상태 변경 → changed (eflaw는 upcoming).
 * 검색 결과 없음 → missing.
 */
export function detectLawChange516(opts: {
  item: LawWatchItem;
  prev: SnapshotRow | null;
  meta: LawMeta | null;
  nowIso: string;
}): DetectResult {
  const { item, prev, meta, nowIso } = opts;

  if (!meta) {
    // 기준선 없이 미발견 → 스킵. 기존 스냅샷 있으면 missing 이벤트.
    if (!prev) return { action: "skip", snapshot: null, event: null };
    const ev = eventOf(
      item.key,
      "missing",
      {
        ident: prev.ident,
        promulgated_at: prev.promulgated_at,
        effective_at: prev.effective_at,
        status: prev.status,
      },
      null,
      nowIso,
    );
    return {
      action: "missing",
      snapshot: { ...prev, last_checked_at: nowIso },
      event: ev,
    };
  }

  const next = snapshotFromMeta516(item, meta, nowIso, prev);
  if (!prev) {
    return { action: "baseline", snapshot: next, event: null };
  }

  const same =
    prev.ident === next.ident &&
    prev.promulgated_at === next.promulgated_at &&
    prev.effective_at === next.effective_at &&
    prev.status === next.status &&
    prev.revision_kind === next.revision_kind;

  if (same) {
    return {
      action: "unchanged",
      snapshot: { ...prev, last_checked_at: nowIso, meta_hash: next.meta_hash },
      event: null,
    };
  }

  const kind: EventKind = item.target === "eflaw" ? "upcoming" : "changed";
  return {
    action: "event",
    snapshot: next,
    event: eventOf(
      item.key,
      kind,
      {
        ident: prev.ident,
        promulgated_at: prev.promulgated_at,
        effective_at: prev.effective_at,
        status: prev.status,
        revision_kind: prev.revision_kind,
      },
      {
        ident: next.ident,
        promulgated_at: next.promulgated_at,
        effective_at: next.effective_at,
        status: next.status,
        revision_kind: next.revision_kind,
      },
      nowIso,
    ),
  };
}
