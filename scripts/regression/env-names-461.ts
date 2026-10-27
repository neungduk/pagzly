/**
 * 회귀 — 461차 배포 전 순서표의 환경변수 이름이 코드와 맞는지 정적으로 검사(소스·문서만 읽음, `.env*`는 열지 않고 값은 보지 않는다).
 * scripts/predeploy-static.ts 는 코드 쪽 이름을 모아 파일에 쓰는 도구라(출력 파일 생성·git 비교) 순수 회귀에 맞지 않아, 체크리스트 대조만 이 파일이 맡는다.
 */
import fs from "node:fs";
import path from "node:path";

export const name = "배포 전 순서표 환경변수 이름 — 필수 이름 포함·코드가 실제로 읽는 이름과 일치";

/** 순서표에 반드시 있어야 하는 이름(필수 3 + R2 7) */
const REQUIRED = [
  "USAGE_GUARD_FAIL_MODE", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_CONTACT_EMAIL",
  "STORAGE_PROVIDER", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL", "NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL",
];
const R2_SEVEN = REQUIRED.slice(3);
const SKIP = new Set(["node_modules", ".next", ".git", "review", "docs", "supabase", "scripts"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith(".env")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const doc = fs.readFileSync("docs/predeploy-checklist.md", "utf8");
  // 환경변수 섹션(## 2.)의 표 첫 열 `NAME`만
  const sec = doc.slice(doc.indexOf("## 2."), doc.indexOf("## 3."));
  const listed = [...sec.matchAll(/^\|\s*`([A-Z][A-Z0-9_]+)`\s*\|/gm)].map((m) => m[1]!);
  for (const n of REQUIRED) if (!listed.includes(n)) f.push(`순서표에 ${n} 없음`);
  if (new Set(listed).size !== listed.length) f.push("순서표에 중복된 이름이 있음");

  // 코드가 읽는 이름 모으기(process.env.NAME, process.env["NAME"], env.NAME 별칭 포함)
  const used = new Set<string>();
  const roots = ["app", "lib", "components"].filter((d) => fs.existsSync(d));
  const files = [...roots.flatMap((d) => walk(d)), ...["next.config.ts", "middleware.ts", "proxy.ts"].filter((p) => fs.existsSync(p))];
  for (const p of files) {
    const s = fs.readFileSync(p, "utf8");
    for (const m of s.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)|process\.env\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]/g)) used.add((m[1] ?? m[2])!);
    // `const env = process.env` 같은 별칭 뒤의 env.NAME 도 읽는 것으로 본다
    for (const m of s.matchAll(/\benv\.([A-Z][A-Z0-9_]+)/g)) used.add(m[1]!);
    // R2 필수 이름은 배열 상수로 나열돼 읽힌다(lib/storage/index.ts R2_REQUIRED_ENV)
    for (const m of s.matchAll(/["'](R2_[A-Z_]+|STORAGE_PROVIDER)["']/g)) used.add(m[1]!);
  }
  for (const n of listed) if (!used.has(n)) f.push(`순서표의 ${n} 을 코드가 읽지 않음(이름 불일치 가능)`);
  // R2 7개 정확히
  const r2Listed = listed.filter((n) => /^R2_|STORAGE/.test(n));
  if (r2Listed.slice().sort().join() !== R2_SEVEN.slice().sort().join()) f.push(`R2 변수 이름 7개가 정확하지 않음: ${r2Listed.join(",")}`);
  // 코드의 R2 변수 이름이 순서표 밖에 더 있으면 알림
  for (const n of used) if (/^R2_/.test(n) && !listed.includes(n)) f.push(`코드가 읽는 ${n} 이 순서표에 없음`);
  // 값이 문서에 들어가지 않았는지(이름 표만): 긴 토큰형 문자열 금지
  if (/[A-Za-z0-9]{40,}/.test(doc)) f.push("순서표에 비밀값 같은 긴 문자열이 있음");
  // 마이그레이션 4개 파일명이 순서표와 실제 파일에 모두 존재
  for (const id of ["20261022100000_usage_guard", "20261022110000_storage_images_policies", "20261022120000_credit_ledger_completion_unique", "20261022130000_signup_free_one_generation"]) {
    if (!fs.existsSync(`supabase/migrations/${id}.sql`)) f.push(`마이그레이션 파일 없음: ${id}`);
    if (!doc.includes(id.slice(0, 14)) && !doc.includes(id)) f.push(`순서표에 ${id} 없음`);
  }
  const pos = ["usage_guard", "storage_images_policies", "credit_ledger_completion_unique", "signup_free_one_generation"].map((k) => doc.indexOf(k));
  if (pos.some((p, i) => p < 0 || (i > 0 && p <= pos[i - 1]!))) f.push("마이그레이션 순서가 순서표에서 어긋남");
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
