/**
 * 516 — 법제처 Open API 클라이언트.
 * OC는 환경변수 LAW_OC만 사용(코드·로그·응답에 노출 금지).
 * 실제 네트워크 호출은 크론/서버에서만. 테스트는 fetch 주입.
 */
import type { LawFetchFail, LawFetchResult, LawMeta, LawTarget } from "./types";

const LAW_BASE = "https://www.law.go.kr/DRF/lawSearch.do";
const REFERER = "https://pagzly.com/";
const ORIGIN = "https://pagzly.com";
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3; // 최초 + 2회 재시도

export type LawFetchFn = typeof fetch;

function ymdToIso(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).replace(/[^0-9]/g, "");
  if (s.length !== 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return null;
}

function parseLawRow(target: LawTarget, row: Record<string, unknown>): LawMeta | null {
  const name = String(pick(row, ["법령명", "행정규칙명", "name"]) ?? "").trim();
  if (!name) return null;
  const ident = String(
    pick(row, [
      "법령일련번호",
      "법령ID",
      "MST",
      "행정규칙일련번호",
      "행정규칙ID",
      "id",
    ]) ?? "",
  ).trim();
  if (!ident) return null;
  const promulgatedAt = ymdToIso(
    pick(row, ["공포일자", "발령일자", "promulgatedAt"]),
  );
  const effectiveAt = ymdToIso(pick(row, ["시행일자", "effectiveAt"]));
  const status = String(
    pick(row, ["현행여부명", "법령상태", "status"]) ??
      (target === "eflaw" ? "시행예정" : "현행"),
  ).trim();
  const revisionKind = String(
    pick(row, ["제개정구분명", "revisionKind"]) ?? "",
  ).trim();
  return {
    target,
    name,
    ident,
    promulgatedAt,
    effectiveAt,
    status,
    revisionKind,
    raw: row,
  };
}

/** 오류 본문(HTTP 200 + result 키) 여부 */
export function isLawApiErrorBody(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  if ("LawSearch" in o || "AdmRulSearch" in o) return false;
  return "result" in o;
}

/** LawSearch / AdmRulSearch → LawMeta[] (객체·배열 정규화) */
export function normalizeLawSearchPayload(
  target: LawTarget,
  json: unknown,
): LawFetchResult {
  if (!json || typeof json !== "object") {
    return { ok: false, reason: "parse", detail: "not_object" };
  }
  if (isLawApiErrorBody(json)) {
    return { ok: false, reason: "api_error", detail: "result_key" };
  }
  const root = json as Record<string, unknown>;
  if (target === "admrul") {
    const block = root.AdmRulSearch as Record<string, unknown> | undefined;
    if (!block) return { ok: false, reason: "parse", detail: "no_AdmRulSearch" };
    const rows = asArray(block.admrul as Record<string, unknown> | Record<string, unknown>[]);
    const items = rows
      .map((r) => parseLawRow(target, r && typeof r === "object" ? r : {}))
      .filter((x): x is LawMeta => Boolean(x));
    return { ok: true, items };
  }
  const block = root.LawSearch as Record<string, unknown> | undefined;
  if (!block) return { ok: false, reason: "parse", detail: "no_LawSearch" };
  const rows = asArray(block.law as Record<string, unknown> | Record<string, unknown>[]);
  const items = rows
    .map((r) => parseLawRow(target, r && typeof r === "object" ? r : {}))
    .filter((x): x is LawMeta => Boolean(x));
  return { ok: true, items };
}

/** 법령명 정확 일치만 */
export function filterExactName(items: LawMeta[], name: string): LawMeta[] {
  const want = name.trim();
  return items.filter((i) => i.name.trim() === want);
}

function looksLikeHtml(text: string): boolean {
  const t = text.trim().slice(0, 200).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<body");
}

async function fetchOnce(
  url: string,
  fetchFn: LawFetchFn,
  signal: AbortSignal,
): Promise<{ ok: true; json: unknown } | { ok: false; retry: boolean; reason: LawFetchFail["reason"] }> {
  try {
    const res = await fetchFn(url, {
      method: "GET",
      cache: "no-store",
      signal,
      headers: {
        Referer: REFERER,
        Origin: ORIGIN,
        Accept: "application/json",
      },
    });
    if (res.status === 502) return { ok: false, retry: true, reason: "http" };
    const text = await res.text();
    if (!text.trim()) return { ok: false, retry: true, reason: "empty" };
    if (looksLikeHtml(text)) return { ok: false, retry: true, reason: "parse" };
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, retry: true, reason: "parse" };
    }
    return { ok: true, json };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, retry: true, reason: "timeout" };
    }
    return { ok: false, retry: true, reason: "http" };
  }
}

export type SearchLawOpts = {
  target: LawTarget;
  query: string;
  fetchFn?: LawFetchFn;
  /** 테스트용 OC 주입. 기본은 process.env.LAW_OC */
  oc?: string | undefined;
};

/**
 * 법령/행정규칙 검색. OC 없으면 { ok:false, reason:"no_oc" } (예외 없음).
 */
export async function searchLaw(opts: SearchLawOpts): Promise<LawFetchResult> {
  const oc = (opts.oc !== undefined ? opts.oc : process.env.LAW_OC)?.trim();
  if (!oc) return { ok: false, reason: "no_oc" };

  const params = new URLSearchParams({
    OC: oc,
    target: opts.target === "admrul" ? "admrul" : opts.target,
    type: "JSON",
    query: opts.query,
    display: "5",
  });
  const url = `${LAW_BASE}?${params.toString()}`;
  const fetchFn = opts.fetchFn ?? fetch;

  let lastFail: LawFetchFail = { ok: false, reason: "empty" };
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const once = await fetchOnce(url, fetchFn, ctrl.signal);
      if (!once.ok) {
        lastFail = { ok: false, reason: once.reason };
        if (!once.retry) return lastFail;
        continue;
      }
      return normalizeLawSearchPayload(opts.target, once.json);
    } finally {
      clearTimeout(timer);
    }
  }
  return lastFail;
}

/** 테스트·감사용: 요청 헤더 상수 */
export const LAW_WATCH_HEADERS = {
  Referer: REFERER,
  Origin: ORIGIN,
} as const;
