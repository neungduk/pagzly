/**
 * 516 — 법령 변경 감시(목업 fetch) + 기준일 표시 가드
 */
import fs from "node:fs";
import path from "node:path";
import {
  LAW_WATCH_HEADERS,
  filterExactName,
  isLawApiErrorBody,
  normalizeLawSearchPayload,
  searchLaw,
} from "../../lib/law-watch/client";
import { detectLawChange516, metaHash516 } from "../../lib/law-watch/detect";
import {
  formatLawBaselineLine516,
  pickLawBaselineDate516,
} from "../../lib/law-watch/baseline-date";
import { runLawWatch516, type LawWatchStore } from "../../lib/law-watch/run";
import {
  collectRuleInstrumentHits516,
  isGuidelineInstrument516,
} from "../../lib/law-watch/rule-basis";
import {
  getLawWatchList516,
  getLawWatchUnwatchable516,
} from "../../lib/law-watch/watch-list";
import type { LawMeta, LawWatchEventInsert, LawWatchItem, SnapshotRow } from "../../lib/law-watch/types";

export const name = "표시사항 516 — 법령 감시·기준일";

const FORBIDDEN = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];

function read(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function memoryStore(): LawWatchStore & {
  snaps: Map<string, SnapshotRow>;
  events: LawWatchEventInsert[];
} {
  const snaps = new Map<string, SnapshotRow>();
  const events: LawWatchEventInsert[] = [];
  return {
    snaps,
    events,
    loadSnapshots: async () => [...snaps.values()],
    upsertSnapshot: async (row) => {
      snaps.set(row.key, row);
    },
    insertEvent: async (ev) => {
      events.push(ev);
    },
  };
}

function meta(partial: Partial<LawMeta> & Pick<LawMeta, "name" | "ident">): LawMeta {
  return {
    target: partial.target ?? "law",
    name: partial.name,
    ident: partial.ident,
    promulgatedAt: partial.promulgatedAt ?? "2026-03-10",
    effectiveAt: partial.effectiveAt ?? "2026-04-02",
    status: partial.status ?? "현행",
    revisionKind: partial.revisionKind ?? "일부개정",
    raw: partial.raw ?? {},
  };
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ocSecret = "test-oc-secret-do-not-leak";

  // (a) Referer/Origin
  if (LAW_WATCH_HEADERS.Referer !== "https://pagzly.com/") {
    fails.push("516a: Referer 고정값 아님");
  }
  if (LAW_WATCH_HEADERS.Origin !== "https://pagzly.com") {
    fails.push("516a: Origin 고정값 아님");
  }
  let sawReferer = false;
  let sawOrigin = false;
  const headerFetch: typeof fetch = async (_url, init) => {
    const h = new Headers(init?.headers);
    if (h.get("Referer") === "https://pagzly.com/") sawReferer = true;
    if (h.get("Origin") === "https://pagzly.com") sawOrigin = true;
    return new Response(
      JSON.stringify({
        LawSearch: {
          law: {
            법령명: "화장품법",
            법령일련번호: "291337",
            공포일자: "20260310",
            시행일자: "20261020",
            현행여부명: "현행",
            제개정구분명: "일부개정",
          },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  await searchLaw({ target: "law", query: "화장품법", fetchFn: headerFetch, oc: ocSecret });
  if (!sawReferer || !sawOrigin) fails.push("516a: 요청에 Referer/Origin 없음");

  // (b) no_oc + OC 미노출
  const noOc = await searchLaw({ target: "law", query: "화장품법", oc: "" });
  if (noOc.ok || noOc.reason !== "no_oc") fails.push("516b: LAW_OC 없음 시 no_oc 아님");
  const logs: string[] = [];
  const prevWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    const store = memoryStore();
    await runLawWatch516({
      store,
      oc: ocSecret,
      items: [
        {
          key: "law:화장품법",
          target: "law",
          name: "화장품법",
          affects: [],
        },
      ],
      search: async () =>
        meta({ name: "화장품법", ident: "1", target: "law" }),
    });
    // 두 번째 실행으로 changed 유도
    await runLawWatch516({
      store,
      oc: ocSecret,
      items: [
        {
          key: "law:화장품법",
          target: "law",
          name: "화장품법",
          affects: [],
        },
      ],
      search: async () =>
        meta({ name: "화장품법", ident: "2", target: "law" }),
    });
  } finally {
    console.warn = prevWarn;
  }
  const leakBlob = JSON.stringify(noOc) + logs.join("\n");
  if (leakBlob.includes(ocSecret)) fails.push("516b: OC 값이 결과/로그에 노출됨");

  // (c) 단건 객체·다건 배열
  const one = normalizeLawSearchPayload("law", {
    LawSearch: {
      law: {
        법령명: "화장품법",
        법령일련번호: "291337",
        공포일자: "20260310",
        시행일자: "20261020",
        현행여부명: "현행",
        제개정구분명: "일부개정",
      },
    },
  });
  const many = normalizeLawSearchPayload("law", {
    LawSearch: {
      law: [
        {
          법령명: "화장품법",
          법령일련번호: "291337",
          공포일자: "20260310",
          시행일자: "20261020",
          현행여부명: "현행",
          제개정구분명: "일부개정",
        },
        {
          법령명: "화장품법 시행령",
          법령일련번호: "283963",
          공포일자: "20260310",
          시행일자: "20260402",
          현행여부명: "현행",
          제개정구분명: "일부개정",
        },
      ],
    },
  });
  if (!one.ok || one.items.length !== 1) fails.push("516c: 단건 객체 정규화 실패");
  if (!many.ok || many.items.length !== 2) fails.push("516c: 다건 배열 정규화 실패");

  // (d) 오류 본문
  if (!isLawApiErrorBody({ result: "ERROR", msg: "필수 입력값이 존재하지 않습니다" })) {
    fails.push("516d: result 키 오류 본문 미감지");
  }
  const errNorm = normalizeLawSearchPayload("law", { result: "ERROR", msg: "x" });
  if (errNorm.ok || errNorm.reason !== "api_error") fails.push("516d: 오류 본문 실패 처리 아님");

  // (e) 정확 일치
  const filtered = filterExactName(
    [
      meta({ name: "화장품법", ident: "1" }),
      meta({ name: "화장품법 시행규칙", ident: "2" }),
    ],
    "화장품법",
  );
  if (filtered.length !== 1 || filtered[0].name !== "화장품법") {
    fails.push("516e: 정확 일치 필터 실패");
  }

  // (f) 기준선 최초 이벤트 0
  {
    const store = memoryStore();
    const item: LawWatchItem = {
      key: "law:화장품법",
      target: "law",
      name: "화장품법",
      affects: [],
    };
    const sum = await runLawWatch516({
      store,
      items: [item],
      search: async () => meta({ name: "화장품법", ident: "291337" }),
    });
    if (store.events.length !== 0) fails.push("516f: 기준선에 이벤트 생김");
    if (sum.baseline !== 1) fails.push("516f: baseline 건수 아님");
  }

  // (g) MST 변경·시행일·upcoming·missing
  {
    const store = memoryStore();
    const lawItem: LawWatchItem = {
      key: "law:화장품법",
      target: "law",
      name: "화장품법",
      affects: [],
    };
    const efItem: LawWatchItem = {
      key: "eflaw:화장품법",
      target: "eflaw",
      name: "화장품법",
      affects: [],
    };
    await runLawWatch516({
      store,
      items: [lawItem, efItem],
      search: async (it) =>
        meta({
          name: "화장품법",
          ident: "291337",
          target: it.target,
          effectiveAt: "2026-10-20",
          status: it.target === "eflaw" ? "시행예정" : "현행",
        }),
    });
    await runLawWatch516({
      store,
      items: [lawItem, efItem],
      search: async (it) => {
        if (it.key === "law:화장품법") {
          return meta({
            name: "화장품법",
            ident: "999999",
            effectiveAt: "2027-01-01",
            target: "law",
          });
        }
        return meta({
          name: "화장품법",
          ident: "888888",
          target: "eflaw",
          status: "시행예정",
          effectiveAt: "2028-01-01",
        });
      },
    });
    const kinds = store.events.map((e) => e.kind).sort();
    if (!kinds.includes("changed")) fails.push("516g: MST/시행일 changed 없음");
    if (!kinds.includes("upcoming")) fails.push("516g: eflaw upcoming 없음");

    await runLawWatch516({
      store,
      items: [lawItem],
      search: async () => null,
    });
    if (!store.events.some((e) => e.kind === "missing")) {
      fails.push("516g: missing 판정 없음");
    }
  }

  // detect unit: effective date only
  {
    const item: LawWatchItem = {
      key: "law:x",
      target: "law",
      name: "화장품법",
      affects: [],
    };
    const prev: SnapshotRow = {
      key: "law:x",
      name: "화장품법",
      ident: "1",
      promulgated_at: "2026-03-10",
      effective_at: "2026-04-02",
      status: "현행",
      revision_kind: "일부개정",
      meta_hash: metaHash516({
        ident: "1",
        promulgatedAt: "2026-03-10",
        effectiveAt: "2026-04-02",
        status: "현행",
        revisionKind: "일부개정",
      }),
      last_checked_at: "2026-11-01T00:00:00.000Z",
      last_changed_at: "2026-11-01T00:00:00.000Z",
    };
    const d = detectLawChange516({
      item,
      prev,
      meta: meta({ name: "화장품법", ident: "1", effectiveAt: "2026-12-01" }),
      nowIso: "2026-11-10T00:00:00.000Z",
    });
    if (d.action !== "event" || d.event?.kind !== "changed") {
      fails.push("516g: 시행일만 변경 시 changed 아님");
    }
  }

  // (h) 기준일 7일/없음
  {
    const keys = ["a", "b"];
    const fresh = pickLawBaselineDate516(
      [
        { key: "a", last_checked_at: new Date().toISOString() },
        { key: "b", last_checked_at: new Date().toISOString() },
      ],
      keys,
    );
    if (!fresh) fails.push("516h: 최신 데이터인데 기준일 null");
    const old = pickLawBaselineDate516(
      [
        { key: "a", last_checked_at: "2020-01-01T00:00:00.000Z" },
        { key: "b", last_checked_at: "2020-01-02T00:00:00.000Z" },
      ],
      keys,
    );
    if (old) fails.push("516h: 7일 초과인데 표시됨");
    const missing = pickLawBaselineDate516(
      [{ key: "a", last_checked_at: new Date().toISOString() }],
      keys,
    );
    if (missing) fails.push("516h: 항목 부족인데 표시됨");
    const line = formatLawBaselineLine516("2026-11-10");
    if (!line.includes("법령 확인 기준일: 2026-11-10")) {
      fails.push("516h: 기준일 문구 형식 아님");
    }
    if (/최신 법령 반영|개정 완료/.test(line)) {
      fails.push("516h: 단정 문구 포함");
    }
  }

  // (i) 감시 목록 ↔ 규칙 근거
  {
    const watch = getLawWatchList516();
    const unwatch = getLawWatchUnwatchable516();
    const hits = collectRuleInstrumentHits516();
    const watchNames = new Set(watch.map((w) => w.name));
    const unwatchNames = new Set(unwatch.map((u) => u.name));

    for (const h of hits) {
      if (isGuidelineInstrument516(h.name)) {
        const ok = [...unwatchNames].some((n) => n.includes("표시·광고 관리 지침"));
        if (!ok) fails.push(`516i: 지침 '${h.name}' 이 감시 불가 목록에 없음`);
        continue;
      }
      if (h.name === "화장품법 시행령") {
        // 규칙에 거의 없어도 감시 목록 필수
        if (!watchNames.has("화장품법 시행령")) {
          fails.push("516i: 시행령 감시 항목 없음");
        }
        continue;
      }
      if (!watchNames.has(h.name) && h.name !== "기능성화장품 기준 및 시험방법") {
        // 기능성은 규칙에 이름 전체로 안 나올 수 있음
        if (h.files.length && !watchNames.has(h.name)) {
          fails.push(`516i: 규칙 근거 '${h.name}' 감시 목록 누락 (${h.files.join(",")})`);
        }
      }
    }

    for (const name of ["화장품법", "화장품법 시행령", "화장품법 시행규칙"]) {
      if (![...watch].some((w) => w.target === "law" && w.name === name)) {
        fails.push(`516i: law 감시 누락 ${name}`);
      }
      if (![...watch].some((w) => w.target === "eflaw" && w.name === name)) {
        fails.push(`516i: eflaw 감시 누락 ${name}`);
      }
    }

    const listPath = path.join("review", "data", "law-watch-516.json");
    if (!fs.existsSync(listPath)) fails.push("516i: law-watch-516.json 없음");
  }

  // (j) 금지어 — UI·lib 카피
  {
    const files = [
      "components/label-check/ui-511/LabelFooter.tsx",
      "components/label-check/ui-507/ResultView.tsx",
      "components/label-check/LawBaselineClient516.tsx",
      "lib/law-watch/baseline-date.ts",
      "app/api/cron/law-watch/route.ts",
    ];
    for (const f of files) {
      const t = read(f);
      for (const w of FORBIDDEN) {
        if (t.includes(w)) fails.push(`516j: 금지어 ${w} in ${f}`);
      }
    }
  }

  // 크론·vercel·마이그레이션 정적
  {
    const cron = read("app/api/cron/law-watch/route.ts");
    if (!cron.includes("CRON_SECRET") || !cron.includes("Bearer")) {
      fails.push("516: 크론 CRON_SECRET 인증 없음");
    }
    if (/LAW_OC|process\.env\.LAW_OC/.test(cron) && /json\(\{[^}]*LAW_OC/.test(cron)) {
      fails.push("516: 응답에 OC 포함 의심");
    }
    const vj = read("vercel.json");
    if (!vj.includes("/api/cron/law-watch") || !vj.includes("0 2 * * *")) {
      fails.push("516: vercel.json 크론 미등록");
    }
    const mig = read("supabase/migrations/20261110160000_law_watch.sql");
    if (!mig.includes("law_watch_snapshots") || !mig.includes("law_watch_events")) {
      fails.push("516: 마이그레이션 테이블 없음");
    }
    if (!mig.includes("enable row level security")) {
      fails.push("516: RLS 미설정");
    }
  }

  return fails;
}
