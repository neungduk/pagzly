/**
 * 회귀 — 453차 4 사전 점검 SQL 초안(docs/premigration-checks-draft.sql). ① 첫 줄에 원본이 아님을 명시 ② 주석·문자열을 뺀 문장이 전부 SELECT/WITH로 시작
 * ③ DDL·DML 금지 키워드 0 ④ 4개 마이그레이션 번호별 섹션이 있고 각 쿼리 위에 「의도」「기대」 주석이 있다 ⑤ 기존 마이그레이션 파일은 읽기만(이 회귀는 쓰지 않는다).
 */
import fs from "node:fs";

export const name = "사전 점검 SQL 초안 — SELECT 전용·금지 키워드 0·마이그레이션 4개 섹션·의도/기대 주석";

const FORBIDDEN = /\b(insert|update|delete|alter|drop|create|truncate|grant|revoke|merge|copy|call|execute|vacuum|reindex|comment\s+on|set\s+role|do)\b/i;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const file = "docs/premigration-checks-draft.sql";
  if (!fs.existsSync(file)) return [`${file} 없음`];
  const raw = fs.readFileSync(file, "utf8");
  const first = raw.split("\n")[0] ?? "";
  if (!/원본/.test(first) || !/429-premigration-checks\.sql/.test(first) || !/아니다/.test(first)) fails.push("첫 줄에 원본이 아님을 명시하지 않음");
  const code = raw.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n").replace(/'(?:[^']|'')*'/g, "''");
  const stmts = code.split(";").map((x) => x.trim()).filter(Boolean);
  if (stmts.length < 12) fails.push(`문장 ${stmts.length}개 < 12`);
  for (const st of stmts) {
    if (!/^(select|with)\b/i.test(st)) fails.push(`SELECT/WITH로 시작하지 않는 문장: ${st.slice(0, 40)}`);
    const m = FORBIDDEN.exec(st.replace(/--.*$/gm, ""));
    if (m) fails.push(`금지 키워드 «${m[0]}»: ${st.slice(0, 50).replace(/\s+/g, " ")}`);
  }
  for (const n of ["20261022100000", "20261022110000", "20261022120000", "20261022130000"]) {
    if (!raw.includes(`[${n}]`)) fails.push(`${n} 섹션 없음`);
    if (!fs.readdirSync("supabase/migrations").some((f) => f.startsWith(n))) fails.push(`마이그레이션 ${n} 파일이 없음`);
  }
  const intents = (raw.match(/--\s*\d-\d\)\s*의도:/g) ?? []).length;
  const expects = (raw.match(/--\s+기대:/g) ?? []).length;
  if (intents < stmts.length) fails.push(`의도 주석 ${intents} < 문장 ${stmts.length}`);
  if (expects < stmts.length) fails.push(`기대 주석 ${expects} < 문장 ${stmts.length}`);
  return fails;
}
