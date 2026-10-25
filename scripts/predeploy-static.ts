/**
 * 452차 4 — 배포 전 정적 점검(환경 파일·네트워크 없이). `.env*` 파일은 열지 않고, 값은 어디에도 출력하지 않는다(파일·줄 번호와 이름만).
 *   npx tsx scripts/predeploy-static.ts [--out=review/452-verify/predeploy-static.md] [--base=origin/main] [--head=HEAD] [--env-list=docs/required-env-names.md]
 * 항목: ① 마이그레이션 4개 존재·순서 ② 429 사전 점검 SQL 존재 ③ 코드가 읽는 process.env 이름 목록(+위험 이름 참조) ④ 비밀값 패턴 ⑤ base...head diff 요약·결제/인증 경로 변경
 *       ⑥ 플래그 기본값이 docs/v4-overview.md와 일치. 합격/불합격/건너뜀 표를 내고, 불합격이 있으면 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type Status = "합격" | "불합격" | "건너뜀";
export type Check = { id: string; title: string; status: Status; detail: string[] };

export const PLANNED_MIGRATIONS = ["20261022100000", "20261022110000", "20261022120000", "20261022130000"] as const;
export const RISK_ENV_NAMES = ["USAGE_GUARD_FAIL_MODE", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_CONTACT_EMAIL"] as const;
/** 결제·인증 경로(변경 0이어야 하는 것) */
export const PAYMENT_PATHS = [/^app\/api\/billing\//, /^app\/billing\//, /^lib\/toss\//, /^app\/auth\//, /^lib\/billing/, /^components\/Billing/];
/** 값이 아니라 형태만 보는 비밀값 패턴. 일치 시 파일·줄 번호만 기록한다 */
export const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "라이브 시크릿 키 접두사", re: /\b(?:sk|rk)_live_[A-Za-z0-9]{8,}/ },
  { name: "테스트 시크릿 키 접두사(긴 값)", re: /\b(?:sk|rk)_test_[A-Za-z0-9]{16,}/ },
  { name: "JWT 형태", re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "AWS 액세스 키", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "구글 API 키", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "개인 키 블록", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "깃허브 토큰", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: "슬랙 토큰", re: /\bxox[bpas]-[A-Za-z0-9-]{20,}/ },
  { name: "긴 값 대입(secret/token/password)", re: /\b(?:secret|token|password|api_?key)\w*\s*[:=]\s*["'][A-Za-z0-9+/_-]{32,}["']/i },
];

const sh = (cmd: string, args: string[]): { ok: boolean; out: string } => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? "" };
};
const tracked = (): string[] => sh("git", ["ls-files"]).out.split("\n").filter(Boolean);
const isEnvFile = (f: string): boolean => /(^|\/)\.env(\.|$)/.test(f);
const isText = (f: string): boolean => /\.(ts|tsx|js|jsx|mjs|cjs|json|md|sql|toml|yml|yaml|css|html|txt)$/.test(f);

export function checkMigrations(files = tracked()): Check {
  const dir = files.filter((f) => /^supabase\/migrations\/.+\.sql$/.test(f)).map((f) => path.basename(f)).sort();
  const detail: string[] = [];
  let ok = true;
  const found = PLANNED_MIGRATIONS.map((n) => dir.find((f) => f.startsWith(n + "_")));
  PLANNED_MIGRATIONS.forEach((n, i) => {
    const f = found[i];
    if (!f) { ok = false; detail.push(`${n}: 없음`); return; }
    const p = path.join("supabase/migrations", f);
    const first = fs.readFileSync(p, "utf8").split("\n").find((l) => l.trim()) ?? "";
    detail.push(`${f} — ${fs.statSync(p).size}B, 첫 줄 «${first.slice(0, 50)}»`);
  });
  const idx = found.map((f) => (f ? dir.indexOf(f) : -1));
  if (idx.some((v, i) => i > 0 && v <= idx[i - 1]!)) { ok = false; detail.push("번호 순서가 정렬 순서와 다름"); }
  const after = idx[3] !== undefined && idx[3] >= 0 ? dir.slice(idx[3] + 1) : [];
  if (after.length) detail.push(`계획된 4개 뒤에 더 있는 파일: ${after.join(", ")}`);
  return { id: "migrations", title: "마이그레이션 4개 존재·순서", status: ok ? "합격" : "불합격", detail };
}

export function checkPremigration(files = tracked()): Check {
  const hit = files.filter((f) => /premigration/i.test(f) || /^429-/.test(path.basename(f)));
  return hit.length
    ? { id: "premigration", title: "429 사전 점검 SQL", status: "합격", detail: hit }
    : { id: "premigration", title: "429 사전 점검 SQL", status: "불합격", detail: ["저장소에 `429-premigration-checks.sql`(또는 premigration 이름 파일)이 없다 — 지시서가 가리키는 파일이 추적되지 않음"] };
}

export function collectEnvNames(files = tracked()): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const f of files) {
    if (isEnvFile(f) || !/^(lib|app|components|middleware|proxy|instrumentation|next\.config)/.test(f) || !/\.(ts|tsx|js|mjs)$/.test(f)) continue;
    const src = fs.readFileSync(f, "utf8");
    // `const env = process.env` 같은 별칭 뒤의 `env.NAME`도 잡는다(별칭이 있는 파일에 한정)
    const alias = /\bprocess\.env\b(?!\.|\[)/.test(src) || /env\s*(?::|=)\s*(?:process\.env|[A-Za-z]*Env)/.test(src);
    const re = alias ? /process\.env\.([A-Z][A-Z0-9_]+)|process\.env\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]|\benv\.([A-Z][A-Z0-9_]{3,})/g : /process\.env\.([A-Z][A-Z0-9_]+)|process\.env\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]/g;
    for (const x of src.matchAll(re)) {
      const n = (x[1] ?? x[2] ?? x[3])!;
      m.set(n, [...new Set([...(m.get(n) ?? []), f])]);
    }
  }
  return m;
}

export function checkEnvNames(files = tracked(), listOut?: string): Check {
  const names = collectEnvNames(files);
  const detail: string[] = [`읽는 이름 ${names.size}개`];
  let ok = true;
  for (const r of RISK_ENV_NAMES) {
    const where = names.get(r);
    if (!where) { ok = false; detail.push(`${r}: 코드에서 참조되지 않음`); } else detail.push(`${r}: ${where.length}개 파일에서 참조(${where.slice(0, 2).join(", ")})`);
  }
  if (listOut) {
    const sorted = [...names.keys()].sort();
    fs.mkdirSync(path.dirname(listOut), { recursive: true });
    fs.writeFileSync(listOut, ["# 코드가 읽는 환경변수 이름 (452차 자동 생성, 값 없음)", "", "`scripts/predeploy-static.ts`가 `process.env.NAME`을 정적으로 모은 목록이다. `NEXT_PUBLIC_*`는 빌드 시 코드에 들어간다.", "", "| 이름 | 참조 파일 수 | 공개(NEXT_PUBLIC) |", "|---|---|---|", ...sorted.map((n) => `| \`${n}\` | ${names.get(n)!.length} | ${n.startsWith("NEXT_PUBLIC_") ? "예" : "아니오"} |`), ""].join("\n"));
    detail.push(`목록 파일: ${listOut}`);
  }
  return { id: "env-names", title: "환경변수 이름 목록·위험 이름 참조", status: ok ? "합격" : "불합격", detail };
}

export function checkSecrets(files = tracked()): Check {
  const detail: string[] = [];
  const envTracked = files.filter(isEnvFile).filter((f) => !/\.(example|sample|template)$/.test(f));
  for (const f of envTracked) detail.push(`추적 중인 env 파일: ${f}`);
  let scanned = 0;
  for (const f of files) {
    if (isEnvFile(f) || !isText(f) || /^(review|docs|node_modules)\//.test(f) || /package-lock\.json$/.test(f)) continue;
    let src: string;
    try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
    if (src.length > 2_000_000) continue;
    scanned += 1;
    src.split("\n").forEach((line, i) => {
      for (const p of SECRET_PATTERNS) if (p.re.test(line) && !/dummy|example|placeholder|xxxx|test-key|fake/i.test(line)) detail.push(`${f}:${i + 1} — ${p.name}`);
    });
  }
  detail.unshift(`검사한 파일 ${scanned}개(리뷰·문서 제외), 패턴 ${SECRET_PATTERNS.length}종`);
  return { id: "secrets", title: "비밀값 패턴·env 추적 여부", status: detail.length > 1 ? "불합격" : "합격", detail };
}

export function checkDiff(base: string, head: string): Check {
  const exists = sh("git", ["rev-parse", "--verify", "--quiet", base]).ok && sh("git", ["rev-parse", "--verify", "--quiet", head]).ok;
  if (!exists) return { id: "diff", title: `${base}...${head} 변경 요약·결제/인증 경로`, status: "건너뜀", detail: [`${base} 또는 ${head} 참조가 없음(git fetch origin main 필요)`] };
  // 얕은 클론이면 merge-base를 믿을 수 없어(세 점 비교가 0건으로 나옴) 두 커밋의 트리를 직접 비교한다 — main이 앞선 변경은 반대로 나타날 수 있다
  const shallow = sh("git", ["rev-parse", "--is-shallow-repository"]).out.trim() === "true";
  const range = shallow ? [base, head] : [`${base}...${head}`];
  const names = sh("git", ["diff", "--name-only", ...range]).out.split("\n").filter(Boolean);
  const stat = sh("git", ["diff", "--shortstat", ...range]).out.trim();
  const dirs = new Map<string, number>();
  for (const f of names) { const d = f.includes("/") ? f.split("/").slice(0, 2).join("/") : "(루트)"; dirs.set(d, (dirs.get(d) ?? 0) + 1); }
  const top = [...dirs].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([d, n]) => `${d} ${n}`);
  const pay = names.filter((f) => PAYMENT_PATHS.some((re) => re.test(f)));
  const detail = [...(shallow ? ["얕은 클론: 두 커밋 트리 직접 비교(git diff base head)"] : []), `파일 ${names.length}개 — ${stat || "변경 없음"}`, `상위 디렉터리: ${top.join(" · ")}`, pay.length ? `결제·인증 경로 변경 ${pay.length}개: ${pay.join(", ")}` : "결제·인증 경로 변경 0개(app/api/billing·app/billing·lib/toss·app/auth·lib/billing*·components/Billing*)"];
  return { id: "diff", title: `${base}...${head} 변경 요약·결제/인증 경로`, status: pay.length ? "불합격" : "합격", detail };
}

export function checkFlagDocs(): Check {
  const doc = fs.existsSync("docs/v4-overview.md") ? fs.readFileSync("docs/v4-overview.md", "utf8") : "";
  if (!doc) return { id: "flags", title: "플래그 기본값 ↔ docs/v4-overview.md", status: "건너뜀", detail: ["docs/v4-overview.md 없음"] };
  const detail: string[] = [];
  let ok = true;
  const src = ["lib", "components", "app"].flatMap((d) => (fs.existsSync(d) ? walk(d) : [])).map((p) => fs.readFileSync(p, "utf8")).join("\n");
  for (const [flag, re, docWord] of [["NEXT_PUBLIC_DESIGN_V4", /NEXT_PUBLIC_DESIGN_V4 !== "off"/, "켬"], ["NEXT_PUBLIC_DESIGN_POLISH", /NEXT_PUBLIC_DESIGN_POLISH !== "off"/, "켬"], ["NEXT_PUBLIC_HERO_V2", /NEXT_PUBLIC_HERO_V2 !== "off"/, "켬"], ["NEXT_PUBLIC_HERO_STAGE", /NEXT_PUBLIC_HERO_STAGE === "on"/, "끔"]] as const) {
    const row = doc.split("\n").find((l) => l.includes(`\`${flag}\``) && l.startsWith("|")) ?? "";
    const codeOk = re.test(src);
    const docOk = row.includes(docWord);
    if (!codeOk || !docOk) ok = false;
    detail.push(`${flag}: 코드 ${codeOk ? "일치" : "다름"} · 문서(${docWord}) ${docOk ? "일치" : "다름"}`);
  }
  return { id: "flags", title: "플래그 기본값 ↔ docs/v4-overview.md", status: ok ? "합격" : "불합격", detail };
}

function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(f.name)) out.push(p);
  }
  return out;
}

export function runAll(opts: { base?: string; head?: string; envList?: string } = {}): Check[] {
  const files = tracked();
  return [checkMigrations(files), checkPremigration(files), checkEnvNames(files, opts.envList), checkSecrets(files), checkDiff(opts.base ?? "origin/main", opts.head ?? "HEAD"), checkFlagDocs()];
}

export function toMarkdown(cs: Check[]): string {
  return ["# 배포 전 정적 점검 (452차)", "", "환경 파일은 열지 않았고 값은 출력하지 않는다.", "", "| 항목 | 결과 |", "|---|---|", ...cs.map((c) => `| ${c.title} | ${c.status} |`), "", ...cs.flatMap((c) => [`## ${c.title} — ${c.status}`, ...c.detail.map((d) => `- ${d}`), ""])].join("\n");
}

if (/predeploy-static\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const cs = runAll({ base: arg("base", "origin/main"), head: arg("head", "HEAD"), envList: arg("env-list", "docs/required-env-names.md") });
  const md = toMarkdown(cs);
  const out = arg("out", "review/452-verify/predeploy-static.md");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md);
  console.log(cs.map((c) => `${c.status}  ${c.title}`).join("\n"));
  process.exit(cs.some((c) => c.status === "불합격") ? 1 : 0);
}
