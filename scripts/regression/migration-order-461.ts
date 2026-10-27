/** 회귀 — 461차 이전 순서 문서 정적 검사(문자열만, 네트워크·브라우저 없음): 14단계가 모두 있고 순서가 맞고 원본이 한 곳. */
import fs from "node:fs";

export const name = "이전 순서 문서 — 14단계 존재·순서·멈춤/되돌리기 열·원본 한 곳";

/** 단계 번호와 그 행에 반드시 있어야 하는 핵심 문구 */
const STEPS: Array<[number, string[]]> = [
  [1, ["드라이런"]],
  [2, ["1차 복사", "--apply"]],
  [3, ["검증", "--verify"]],
  [4, ["STORAGE_PROVIDER=r2"]],
  [5, ["2차 복사", "--only-missing"]],
  [6, ["검증 재실행"]],
  [7, ["01-backup.sql"]],
  [8, ["02-preview.sql"]],
  [9, ["03-apply.sql", "COMMIT"]],
  [10, ["04-verify.sql"]],
  [11, ["99-rollback.sql"]],
  [12, ["크론", "vercel.json"]],
  [13, ["3일", "egress"]],
  [14, ["90일"]],
];

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const doc = fs.readFileSync("docs/migration-r2/README.md", "utf8");
  const rows = doc.split("\n").filter((l) => /^\|\s*\d+\s*\|/.test(l));
  if (rows.length !== 14) f.push(`단계 행이 14개가 아님(${rows.length})`);
  let lastIdx = -1;
  for (const [n, keys] of STEPS) {
    const idx = rows.findIndex((r) => new RegExp(`^\\|\\s*${n}\\s*\\|`).test(r));
    if (idx < 0) { f.push(`${n}단계 없음`); continue; }
    if (idx <= lastIdx) f.push(`${n}단계 순서가 어긋남`);
    lastIdx = idx;
    for (const k of keys) if (!rows[idx]!.includes(k)) f.push(`${n}단계 행에 "${k}" 없음`);
    if (rows[idx]!.split("|").length < 8) f.push(`${n}단계 열이 부족함(합격·멈춤·되돌리기·붙여넣기)`);
  }
  // 핵심 순서: 켜기(4) → 2차 복사(5) → DB 백업(7) → 교체(9) → 정리 크론(12)
  const pos = (n: number) => rows.findIndex((r) => new RegExp(`^\\|\\s*${n}\\s*\\|`).test(r));
  if (!(pos(4) < pos(5) && pos(5) < pos(7) && pos(7) < pos(9) && pos(9) < pos(12))) f.push("켜기→2차 복사→백업→교체→크론 순서가 아님");
  if (!/02-preview\.sql[^\n]*결과 전체|`02-preview\.sql` 결과 전체/.test(doc)) f.push("02-preview 결과를 붙여넣을 곳 안내 없음");
  if (!/드라이런 출력 전체/.test(doc)) f.push("드라이런 출력을 붙여넣을 곳 안내 없음");
  if (!/실사진/.test(doc)) f.push("이전 전 실사진 검증 금지 문구 없음");

  // 원본은 README 한 곳: r2-setup 은 이를 링크하고 번호 순서표를 따로 갖지 않는다
  const r2 = fs.readFileSync("docs/r2-setup.md", "utf8");
  if (!r2.includes("docs/migration-r2/README.md")) f.push("r2-setup 이 순서 원본을 링크하지 않음");
  if (r2.split("\n").filter((l) => /^\|\s*\d+\s*\|/.test(l)).length > 0) f.push("r2-setup 에 별도 번호 순서표가 있음");
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
