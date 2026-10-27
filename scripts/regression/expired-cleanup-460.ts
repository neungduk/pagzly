/** 회귀 — 460차 만료 이미지 정리 판정·실행(가짜 DB·가짜 provider, 네트워크 없음). */
import fs from "node:fs";
import { cutoffIso, isExpiredImage, runExpiredCleanup, type ExpiredRow } from "../../lib/storage/expired-cleanup";
import { CLEANUP_MAX_PER_RUN } from "../../lib/storage/policy";

export const name = "만료 이미지 정리 — 만료/영구/보호 판정·상한·삭제 실패 시 행 유지·CRON_SECRET 인증(정적)";

const NOW = new Date("2026-10-27T00:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const row = (id: string, o: Partial<ExpiredRow> = {}): ExpiredRow => ({ id, storage_path: `u/${id}.png`, product_id: null, image_uploaded_at: day(4), protected_until: null, ...o });

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };

  ok(isExpiredImage(row("a"), NOW), "4일 지난 미연결 이미지가 만료 아님");
  ok(!isExpiredImage(row("a", { image_uploaded_at: day(2) }), NOW), "2일 된 이미지를 만료로 봄");
  ok(!isExpiredImage(row("a", { product_id: "p1" }), NOW), "완성 상품 이미지(영구)를 만료로 봄");
  ok(!isExpiredImage(row("a", { protected_until: new Date(NOW.getTime() + 3600_000).toISOString() }), NOW), "보호 기간 중 이미지를 만료로 봄");
  ok(isExpiredImage(row("a", { protected_until: day(1) }), NOW), "보호가 끝난 이미지가 만료 아님");
  ok(cutoffIso(NOW) === day(3), "cutoff 가 3일 전이 아님");

  const mk = (rows: ExpiredRow[], failOn?: (paths: string[]) => boolean, delErr = false) => {
    const removed: string[][] = []; const deleted: string[][] = []; let seenLimit = 0;
    return {
      removed, deleted, get seenLimit() { return seenLimit; },
      deps: {
        now: () => NOW, chunkSize: 2,
        storage: { name: "r2" as const, removeObjects: async (p: string[]) => { removed.push(p); return failOn?.(p) ? { error: { message: "boom" } } : { error: null }; } },
        listCandidates: async (_c: string, _n: string, limit: number) => { seenLimit = limit; return { rows, error: null }; },
        deleteRows: async (ids: string[]) => { deleted.push(ids); return { error: delErr ? "x" : null }; },
      },
    };
  };

  // 만료만 지우고 영구·보호는 건드리지 않는다(DB가 잘못 넘겨도 재판정)
  { const m = mk([row("a"), row("b", { product_id: "p" }), row("c", { protected_until: new Date(NOW.getTime() + 1000).toISOString() }), row("d")]);
    const r = await runExpiredCleanup(m.deps);
    ok(r.selected === 2 && r.deleted === 2 && r.ok, `기본 ${JSON.stringify(r)}`);
    ok(m.removed.flat().sort().join() === "u/a.png,u/d.png", "저장소에서 지운 경로"); ok(m.deleted.flat().sort().join() === "a,d", "지운 행"); }

  // 상한
  { const rows = Array.from({ length: CLEANUP_MAX_PER_RUN + 50 }, (_, i) => row(`r${i}`));
    const m = mk(rows); const r = await runExpiredCleanup({ ...m.deps, chunkSize: 100 });
    ok(r.selected === CLEANUP_MAX_PER_RUN && m.seenLimit === CLEANUP_MAX_PER_RUN, `상한 ${r.selected}/${m.seenLimit}`);
    const m2 = mk(rows); const r2 = await runExpiredCleanup({ ...m2.deps, limit: 3 }); ok(r2.selected === 3 && m2.seenLimit === 3, "호출 상한 3"); }

  // 삭제 실패 → 그 묶음의 행 유지(재시도), 다른 묶음은 진행
  { const m = mk([row("a"), row("b"), row("c"), row("d")], (p) => p.includes("u/a.png"));
    const r = await runExpiredCleanup(m.deps);
    ok(!r.ok && r.failedChunks === 1 && r.deleted === 2, `실패 처리 ${JSON.stringify(r)}`);
    ok(m.deleted.flat().sort().join() === "c,d", "실패 묶음의 행을 지움"); }

  // 행 삭제 실패는 오류로 집계, 목록 실패는 아무것도 안 함
  { const r = await runExpiredCleanup(mk([row("a")], undefined, true).deps); ok(!r.ok && r.rowDeleteErrors === 1 && r.deleted === 0, "행 삭제 실패 집계"); }
  { const m = mk([]); const r = await runExpiredCleanup({ ...m.deps, listCandidates: async () => ({ rows: [], error: "db" }) });
    ok(!r.ok && r.error === "list_failed" && m.removed.length === 0, "목록 실패 처리"); }
  { const r = await runExpiredCleanup(mk([]).deps); ok(r.ok && r.selected === 0, "빈 목록"); }

  // 정적: 라우트가 CRON_SECRET 없이는 401, provider 경유, 비밀 로그 없음
  const route = fs.readFileSync("app/api/cron/cleanup-expired-images/route.ts", "utf8");
  ok(/!process\.env\.CRON_SECRET \|\| authHeader !== `Bearer \$\{process\.env\.CRON_SECRET\}`/.test(route), "CRON_SECRET 인증 형태가 renew 와 다름");
  ok(route.indexOf("unauthorized") < route.indexOf("createServiceRoleClient()"), "인증 전에 서비스 클라이언트 생성");
  ok(/getStorage\(/.test(route) && !/supabase\.storage|\.storage\.from/.test(route), "provider 를 거치지 않음");
  ok(!/console\.\w+\([^)]*(paths|storage_path|process\.env)/.test(route), "경로·환경값 로그");
  const vj = fs.readFileSync("vercel.json", "utf8"); ok(!vj.includes("cleanup-expired-images"), "vercel.json 에 기본 등록됨(문서화만이어야 함)");
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
