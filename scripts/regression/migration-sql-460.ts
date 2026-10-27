/** 회귀 — 460차 DB 주소 교체 SQL 정적 검사(실행하지 않는다): 파괴적 문장 없음·UPDATE 위치·백업이 교체 대상 포괄·호스트 하드코딩 없음. */
import fs from "node:fs";
import path from "node:path";

export const name = "DB 주소 교체 SQL — DROP/TRUNCATE/DELETE 없음·UPDATE는 03·99만·백업이 교체 대상 포괄·호스트 미하드코딩";

const DIR = "docs/migration-r2";
const FILES = ["01-backup.sql", "02-preview.sql", "03-apply.sql", "04-verify.sql", "99-rollback.sql"];
const stripComments = (s: string): string => s.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const src: Record<string, string> = {};
  for (const n of FILES) {
    const p = path.join(DIR, n);
    if (!fs.existsSync(p)) { f.push(`${n} 없음`); continue; }
    src[n] = fs.readFileSync(p, "utf8");
  }
  if (f.length) return f;

  for (const n of FILES) {
    const code = stripComments(src[n]!);
    if (/\b(drop|truncate)\b/i.test(code)) f.push(`${n}: DROP/TRUNCATE`);
    if (/\bdelete\s+from\b/i.test(code)) f.push(`${n}: DELETE FROM`);
    if (/\b(alter|grant|revoke)\b/i.test(code)) f.push(`${n}: 스키마·권한 변경`);
    if (!/선행 조건/.test(src[n]!.split("\n").slice(0, 6).join("\n"))) f.push(`${n}: 머리 주석에 선행 조건 없음`);
    if (/supabase\.co(?!\/storage)/.test(code) || /[a-z0-9]{20}\.supabase\.co/.test(src[n]!)) f.push(`${n}: 프로젝트 호스트 하드코딩`);
    const hasUpdate = /\bupdate\s+public\./i.test(code);
    if (hasUpdate && n !== "03-apply.sql" && n !== "99-rollback.sql") f.push(`${n}: UPDATE 가 03·99 밖에 있음`);
    if (/\binsert\b/i.test(code)) f.push(`${n}: INSERT`);
  }
  // 01은 새 *_bak_r2 테이블만 만든다
  for (const m of stripComments(src["01-backup.sql"]!).matchAll(/create table\s+([\w.]+)/gi)) if (!/_bak_r2$/.test(m[1]!)) f.push(`01: 백업 외 테이블 생성 ${m[1]}`);
  // 03: 트랜잭션 열고 COMMIT 은 수동(문장으로 들어 있지 않다)
  const c3 = stripComments(src["03-apply.sql"]!);
  if (!/\bbegin\s*;/i.test(c3)) f.push("03: begin 없음");
  if (/\bcommit\s*;/i.test(c3)) f.push("03: COMMIT 이 자동 문장으로 들어 있음");
  if (!/COMMIT은 수동|COMMIT 은 수동/.test(src["03-apply.sql"]!)) f.push("03: COMMIT 수동 안내 없음");
  // 99 도 마찬가지
  if (/\bcommit\s*;/i.test(stripComments(src["99-rollback.sql"]!))) f.push("99: COMMIT 이 자동 문장으로 들어 있음");

  // 01 백업이 03 교체 대상을 모두 덮는다
  const targets: Array<{ table: string; col: string }> = [];
  for (const m of c3.matchAll(/update\s+public\.(\w+)\s+set\s+(\w+)\s*=/gi)) targets.push({ table: m[1]!, col: m[2]! });
  if (targets.length < 8) f.push(`03: UPDATE 대상 ${targets.length}개(8 이상 기대)`);
  const c1 = stripComments(src["01-backup.sql"]!);
  for (const t of targets) {
    const re = new RegExp(`create table\\s+public\\.${t.table}_bak_r2\\s+as\\s+select([^;]*?)from\\s+public\\.${t.table}\\b`, "is");
    const m = c1.match(re);
    if (!m) { f.push(`01: ${t.table} 백업 없음`); continue; }
    if (!new RegExp(`\\b${t.col}\\b`).test(m[1]!)) f.push(`01: ${t.table}.${t.col} 백업 안 함`);
    if (!/\bid\b/.test(m[1]!)) f.push(`01: ${t.table} 백업에 id 없음`);
  }
  // 99 롤백이 백업된 모든 컬럼을 되돌린다
  const c99 = stripComments(src["99-rollback.sql"]!);
  for (const t of targets) if (!new RegExp(`${t.col}\\s*=\\s*b\\.${t.col}`).test(c99)) f.push(`99: ${t.table}.${t.col} 복원 없음`);
  // 04는 SELECT 만, 03 교체 토큰 쌍이 있다
  if (!/__OLD_PREFIX__/.test(src["03-apply.sql"]!) || !/__NEW_PREFIX__/.test(src["03-apply.sql"]!)) f.push("03: 치환 토큰 없음");
  if (/\b(insert|update|delete|create)\b/i.test(stripComments(src["04-verify.sql"]!))) f.push("04: SELECT 외 문장");
  if (/\b(insert|update|delete|create)\b/i.test(stripComments(src["02-preview.sql"]!).replace(/create\s+or\s+replace/gi, "x"))) f.push("02: SELECT 외 문장");
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
