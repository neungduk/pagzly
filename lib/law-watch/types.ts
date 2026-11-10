/** 516 — 법제처 Open API 감시 공통 타입 */

export type LawTarget = "law" | "eflaw" | "admrul";

export type LawMeta = {
  target: LawTarget;
  name: string;
  /** MST(법령일련번호) 또는 행정규칙 ID/일련번호 */
  ident: string;
  promulgatedAt: string | null;
  effectiveAt: string | null;
  status: string;
  revisionKind: string;
  raw: unknown;
};

export type LawWatchItem = {
  key: string;
  target: LawTarget;
  name: string;
  /** 규칙 JSON 그룹/basis 대응 메모 */
  affects: string[];
};

export type LawWatchUnwatchable = {
  name: string;
  reason: string;
  affects: string[];
};

export type LawWatchListFile = {
  items: LawWatchItem[];
  unwatchable: LawWatchUnwatchable[];
};

export type LawFetchOk = { ok: true; items: LawMeta[] };
export type LawFetchFail = {
  ok: false;
  reason: "no_oc" | "http" | "parse" | "api_error" | "timeout" | "empty";
  detail?: string;
};
export type LawFetchResult = LawFetchOk | LawFetchFail;

export type SnapshotRow = {
  key: string;
  name: string;
  ident: string;
  promulgated_at: string | null;
  effective_at: string | null;
  status: string;
  revision_kind: string;
  meta_hash: string;
  last_checked_at: string;
  last_changed_at: string | null;
};

export type EventKind = "changed" | "upcoming" | "missing";

export type LawWatchEventInsert = {
  key: string;
  kind: EventKind;
  before: unknown;
  after: unknown;
  detected_at: string;
};
