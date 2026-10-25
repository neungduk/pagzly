/**
 * 447차 1 — PC 원커맨드 검증. `npx tsx scripts/pc-verify.ts` (또는 `npm run pc-verify`) 한 줄로 단계들을 순서대로 돌리고
 * `review/pc-verify-<날짜>/summary.md`에 합격/불합격/건너뜀 표를 남긴다. 실패해도 의존하지 않는 다음 단계는 계속한다.
 * 환경 파일은 열지 않는다(환경값은 자식 프로세스가 상속만 한다). 환경값은 "있는지"만 보고 값은 읽어 출력하지 않는다.
 *
 * 옵션: --dry-run(명령만 출력) --skip-capture --skip-build --skip-smoke --only=id,id --out=<폴더> --date=YYYY-MM-DD
 *       --make-baseline <commit> [--skip-install]   (기준 스냅샷을 그 커밋의 코드로 만든다 — docs/pc-verify.md)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { findSessions } from "./pc-sessions-find";

export type StepStatus = "합격" | "불합격" | "건너뜀";
export type Step = {
  id: string;
  title: string;
  /** 실행 명령(첫 요소가 실행 파일). 단계 안에서 자식 프로세스 한 개 */
  cmd: string[];
  /** 앞 단계가 합격이어야 실행 */
  needs?: string[];
  /** 건너뜀 사유(없으면 실행) */
  skip?: string;
  /** 불합격이어도 요약에 덧붙일 안내(로그 안 패턴 → 문구) */
  hints?: Array<{ re: RegExp; text: string }>;
  /** 단계 안에서 서버를 띄우는 특수 단계 */
  kind?: "smoke";
  /** 어림 소요(분, 문서·요약용) */
  etaMin?: number;
};

export type Options = { dryRun: boolean; skipCapture: boolean; skipBuild: boolean; skipSmoke: boolean; full: boolean; only: string[]; out: string; date: string };

export const ENV_NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"] as const;
export const SNAP_EXPORT = "review/439-verify/snap-438";
export const SNAP_LIVE = "review/442-verify/snap-438-live";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

export function parseArgs(argv: string[]): Options {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const date = get("date") ?? new Date().toISOString().slice(0, 10);
  return { dryRun: argv.includes("--dry-run"), skipCapture: argv.includes("--skip-capture"), skipBuild: argv.includes("--skip-build"), skipSmoke: argv.includes("--skip-smoke"), full: argv.includes("--full"), only: (get("only") ?? "").split(",").filter(Boolean), out: get("out") ?? `review/pc-verify-${date}`, date };
}

/** 단계 계획(순수 함수 — 회귀가 검사). exists는 파일 존재 확인을 주입한다 */
export function planSteps(o: Options, exists: (p: string) => boolean = fs.existsSync, sessionCount: number = findSessions("review", exists).length): Step[] {
  const baseline = exists(SNAP_EXPORT) && exists(SNAP_LIVE);
  const noBase = `기준 스냅샷(${SNAP_EXPORT}, ${SNAP_LIVE})이 없음 — 먼저 \`npx tsx scripts/pc-verify.ts --make-baseline <438차 커밋>\``;
  const steps: Step[] = [
    { id: "env", title: "1. 환경 점검", cmd: [process.execPath, "-e", "0"], etaMin: 0 },
    { id: "tsc", title: "2. 타입 검사", cmd: [NPX, "tsc", "--noEmit"], etaMin: 1 },
    { id: "regression", title: "3. 회귀 전체", cmd: [NPX, "tsx", "scripts/regression/run-all.ts"], etaMin: 8, hints: [{ re: /Executable doesn't exist|playwright install/i, text: "Playwright 브라우저가 없음 → `npx playwright install chromium` 뒤 다시 실행" }] },
    { id: "off-export", title: "4a. v4 off 동일(export)", cmd: [NPX, "tsx", "scripts/check-v4-off.ts"], skip: baseline ? undefined : noBase, etaMin: 1 },
    { id: "off-live", title: "4b. v4 off 동일(라이브 렌더)", cmd: [NPX, "tsx", "scripts/check-v4-off-live.tsx"], skip: baseline ? undefined : noBase, etaMin: 1 },
    { id: "build", title: "5. next build(PC 환경값 상속)", cmd: [NPX, "next", "build"], skip: o.skipBuild ? "--skip-build" : undefined, etaMin: 3, hints: [{ re: /NEXT_PUBLIC_|Supabase|supabaseUrl/i, text: "환경값 문제 가능 — 환경 점검 단계의 '없음' 항목 확인" }] },
    { id: "sessions", title: "6. 저장 세션 6종(패리티·428 DOM·750 넘침·린트)", cmd: [NPX, "tsx", "scripts/pc-verify-sessions.ts", `--out=${o.out}`], skip: sessionCount ? undefined : "저장 세션 없음 — review/*-live/**/session.json 또는 review/pexels-*/session.json을 두면 자동 탐색", etaMin: 3 },
    { id: "smoke", title: "7. launch-smoke(next start로 띄워 호출)", cmd: [NPX, "tsx", "scripts/launch-smoke.ts"], needs: ["build"], kind: "smoke", skip: o.skipSmoke ? "--skip-smoke" : exists("scripts/launch-smoke.ts") ? undefined : "scripts/launch-smoke.ts 없음", etaMin: 2 },
    // 449차 — 448차 강건성 하네스(사진 스트레스·노출·접근성·크기·style 묶기·퍼징). 기본은 빠른 부분집합, --full이면 전체(퍼징 200·라이브 하네스 포함)
    { id: "predeploy", title: "9h. 배포 전 정적 점검(마이그레이션 4개·비밀값·결제 경로 변경·플래그 기본값, 환경 파일 안 읽음)", cmd: [NPX, "tsx", "scripts/predeploy-static.ts", `--out=${o.out}/predeploy-static.md`], etaMin: 1 },
    { id: "legibility", title: "9a. 사진 스트레스 가독성(극단 사진 17종 × 픽스처)", cmd: [NPX, "tsx", "scripts/photo-legibility.ts", `--out=${o.out}/photo-stress.md`, ...(o.full ? [] : ["--fixtures=fx-compare-fashion,fx-skincare-serum,fx-tech-keyboard+person,fx-skincare-serum+whitebg", "--photos=cutout-white,sat-yellow,sky-ground,very-dark,noise-shelf"])], etaMin: o.full ? 6 : 2 },
    { id: "exposure", title: "9b. 사진 노출 균형(가림 면적비·휘도 보존율)", cmd: [NPX, "tsx", "scripts/photo-exposure.ts", `--out=${o.out}/exposure.md`], etaMin: 2 },
    { id: "a11y", title: "9c. 접근성·구조·성능 린트 R19~R23", cmd: [NPX, "tsx", "scripts/a11y-lint.ts", `--out=${o.out}/a11y-report.md`], etaMin: 2 },
    { id: "size", title: "9d. export HTML 크기 예산", cmd: [NPX, "tsx", "scripts/size-budget.ts", `--out=${o.out}/size-budget.md`], etaMin: 1 },
    { id: "dedupe", title: "9e. 반복 style 묶기 계산 스타일 동일", cmd: [NPX, "tsx", "scripts/style-dedupe-check.ts", ...(o.full ? [] : ["--widths=390"])], etaMin: o.full ? 5 : 2 },
    { id: "fuzz", title: `9f. 입력 퍼징(export, ${o.full ? "200" : "30"}개 · 320·360·390·750)`, cmd: [NPX, "tsx", "scripts/fuzz-check.ts", `--n=${o.full ? 200 : 30}`, `--live=${o.full ? 30 : 6}`, `--out=${o.out}/fuzz-report.md`], etaMin: o.full ? 8 : 2 },
    { id: "dev", title: "9g. 라이브 하네스(PNG 다운로드 대조 + 라이브 퍼징, next dev)", cmd: [NPX, "tsx", "scripts/pc-verify-dev.ts", `--out=${o.out}/dev`, `--fuzz-n=${o.full ? 200 : 40}`], skip: o.full ? undefined : "--full에서만(개발 서버를 띄움, 약 10~25분)", etaMin: 20 },
    { id: "capture", title: "8. 눈 검수 캡처(저장 세션 + 합성, 390·750)", cmd: [NPX, "tsx", "scripts/pc-verify-eye.ts", `--out=${o.out}/eye`], skip: o.skipCapture ? "--skip-capture" : undefined, etaMin: 10 },
  ];
  return o.only.length ? steps.map((s) => (o.only.includes(s.id) ? s : { ...s, skip: s.skip ?? "--only에 없음" })) : steps;
}

/** 눈으로 볼 체크리스트(446차 §10 10~12번 + 447차 후보) */
export const EYE_CHECKLIST: string[] = [
  "색 응집력: 한 페이지가 2~3색 계열로 정돈돼 보이는지, 단조롭지 않은지(시트 `eye/*-w390`·`*-w750`)",
  "히어로: 고스트 글자가 사진·화면 가장자리에서 잘리지 않는지, 프레임 3종(아치·원형 컷·오프셋)에서 실사진 크롭이 자연스러운지, 포화 면이 과하게 강하지 않은지",
  "요약 줄: 번호 배지가 어색하지 않은지, 후기 요약 캡션이 12px로 읽히는지, 사진 위 STEP 칩 글자가 읽히는지",
  "750폭: 같은 면 이웃 사이 빈 칸이 과하지 않은지, 페이지 끝 검색용 평문 블록이 거칠지 않은지",
  "노랑·연두·초록 계열 상품 사진 3건: 가격 기호·POINT 칩·참고 카드 대비가 읽히는지, 페이지가 칙칙하지 않은지",
  "배너·강조 카드·구매 띠·FAQ·표가 실제 폰트·실사진에서 깨지지 않는지(D1·D2·D4)",
];

export type EnvReport = { node: string; fonts: boolean; env: Array<{ name: string; present: boolean }>; git: string };
/** 환경 점검 — 값은 읽지 않고 존재 여부(boolean)만 */
export function envReport(exists: (p: string) => boolean = fs.existsSync, env: NodeJS.ProcessEnv = process.env): EnvReport {
  const g = spawnSync("git", ["status", "--short"], { encoding: "utf8" });
  const lines = (g.stdout ?? "").split("\n").filter(Boolean);
  return { node: process.version, fonts: exists("public/fonts"), env: ENV_NAMES.map((name) => ({ name, present: env[name] !== undefined && env[name] !== "" })), git: `${lines.length}개 변경(${lines.slice(0, 5).map((l) => l.slice(0, 3).trim()).join(",")}${lines.length > 5 ? "…" : ""})` };
}

export type Result = { step: Step; status: StepStatus; ms: number; code: number | null; log: string; note: string };

export function summaryMd(o: Options, results: Result[], env: EnvReport): string {
  const rows = results.map((r) => `| ${r.step.title} | **${r.status}** | ${(r.ms / 1000).toFixed(1)}초 | ${r.code ?? "-"} | \`${r.step.cmd.map((c) => (c === process.execPath ? "node" : c)).join(" ")}\` | ${r.log ? `\`${r.log}\`` : "-"} | ${r.note} |`);
  const pass = results.filter((r) => r.status === "합격").length, fail = results.filter((r) => r.status === "불합격").length, skip = results.filter((r) => r.status === "건너뜀").length;
  return [
    `# PC 검증 요약 (${o.date})`,
    "",
    `합격 ${pass} · 불합격 ${fail} · 건너뜀 ${skip}${fail ? " — **불합격이 있으면 434차로 가지 않는다**" : ""}`,
    "",
    `환경: Node ${env.node} · 폰트 ${env.fonts ? "있음" : "**없음**(`node scripts/build-detail-fonts.mjs`)"} · git ${env.git}`,
    `환경값(존재 여부만): ${env.env.map((e) => `${e.name} ${e.present ? "있음" : "없음"}`).join(" · ")}`,
    "",
    "| 단계 | 결과 | 시간 | 종료 코드 | 명령 | 로그 | 비고 |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## 눈으로 볼 체크리스트",
    ...EYE_CHECKLIST.map((c) => `- [ ] ${c}`),
    "",
    `시트: \`${o.out}/eye/\` (저장 세션이 없으면 합성 21종만 들어 있다)`,
    "",
  ].join("\n");
}

async function waitFor(url: string, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.status < 500) return true; } catch { /* 아직 안 뜸 */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function runCmd(cmd: string[], logPath: string): { code: number | null; ms: number; text: string } {
  const t = Date.now();
  const r = spawnSync(cmd[0]!, cmd.slice(1), { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: process.env, shell: process.platform === "win32" });
  const text = `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n[실행 오류] ${r.error.message}` : ""}`;
  fs.writeFileSync(logPath, text);
  return { code: r.status, ms: Date.now() - t, text };
}

/** smoke: next start를 임의 포트로 띄우고 launch-smoke를 호출한 뒤 서버를 내린다 */
async function runSmoke(step: Step, logPath: string): Promise<{ code: number | null; ms: number; text: string }> {
  const t = Date.now();
  const port = 3199;
  const server = spawn(NPX, ["next", "start", "-p", String(port)], { env: process.env, stdio: "ignore", shell: process.platform === "win32" });
  const up = await waitFor(`http://localhost:${port}/login`, 60000);
  let text = "";
  let code: number | null = 1;
  if (up) {
    const r = spawnSync(step.cmd[0]!, [...step.cmd.slice(1), `http://localhost:${port}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: process.env, shell: process.platform === "win32" });
    text = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    code = r.status;
  } else text = "next start가 60초 안에 뜨지 않음(빌드 산출물·환경값 확인)";
  try { server.kill(); } catch { /* 이미 종료 */ }
  fs.writeFileSync(logPath, text);
  return { code, ms: Date.now() - t, text };
}

function judge(step: Step, code: number | null, text: string): { status: StepStatus; note: string } {
  const hint = step.hints?.find((h) => h.re.test(text))?.text ?? "";
  const tail = text.trim().split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 120) ?? "";
  if (step.id === "regression") {
    const m = /회귀 점검 (통과|실패) ([\d/]+)/.exec(text);
    return { status: code === 0 && m?.[1] === "통과" ? "합격" : "불합격", note: [m ? `${m[1]} ${m[2]}` : tail, hint].filter(Boolean).join(" · ") };
  }
  return { status: code === 0 ? "합격" : "불합격", note: [tail, hint].filter(Boolean).join(" · ") };
}

export async function runAll(o: Options): Promise<Result[]> {
  const steps = planSteps(o);
  const env = envReport();
  fs.mkdirSync(path.join(o.out, "logs"), { recursive: true });
  const results: Result[] = [];
  const statusOf = (id: string) => results.find((r) => r.step.id === id)?.status;
  for (const step of steps) {
    const log = path.join(o.out, "logs", `${step.id}.log`);
    if (o.dryRun) {
      results.push({ step, status: "건너뜀", ms: 0, code: null, log: "", note: step.skip ? `건너뜀 사유: ${step.skip}` : "dry-run(명령만 출력)" });
      console.log(`[dry-run] ${step.title}: ${step.skip ? `건너뜀(${step.skip})` : step.cmd.join(" ")}`);
      continue;
    }
    if (step.skip) { results.push({ step, status: "건너뜀", ms: 0, code: null, log: "", note: step.skip }); console.log(`- ${step.title}: 건너뜀 (${step.skip})`); continue; }
    const dep = (step.needs ?? []).find((n) => statusOf(n) !== "합격");
    if (dep) { results.push({ step, status: "건너뜀", ms: 0, code: null, log: "", note: `앞 단계(${dep})가 합격이 아님` }); console.log(`- ${step.title}: 건너뜀 (앞 단계 ${dep})`); continue; }
    console.log(`- ${step.title} …(어림 ${step.etaMin ?? "?"}분)`);
    if (step.id === "env") {
      const missing = env.env.filter((e) => !e.present).map((e) => e.name);
      const note = `Node ${env.node}, 폰트 ${env.fonts ? "있음" : "없음"}, 환경값 ${env.env.length - missing.length}/${env.env.length}${missing.length ? ` (없음: ${missing.join(", ")})` : ""}`;
      results.push({ step, status: env.fonts ? "합격" : "불합격", ms: 0, code: null, log: "", note });
      continue;
    }
    const r = step.kind === "smoke" ? await runSmoke(step, log) : runCmd(step.cmd, log);
    const j = judge(step, r.code, r.text);
    results.push({ step, status: j.status, ms: r.ms, code: r.code, log, note: j.note });
    console.log(`  → ${j.status} (${(r.ms / 1000).toFixed(1)}초) ${j.note}`);
  }
  if (!o.dryRun) fs.writeFileSync(path.join(o.out, "summary.md"), summaryMd(o, results, env));
  else console.log(`[dry-run] 요약은 저장하지 않음 (${path.join(o.out, "summary.md")})`);
  return results;
}

/** --make-baseline: 임시 worktree에 그 커밋의 lib/app을 두고, 현재 scripts·픽스처를 덮어 기준 스냅샷을 만든 뒤 현재 저장소의 기준 경로로 복사하고 worktree를 지운다 */
export function makeBaseline(commit: string, skipInstall: boolean): number {
  const dir = path.join(os.tmpdir(), `pzv-base-${commit.slice(0, 8)}-${Date.now()}`);
  const sh = (cmd: string[], cwd?: string) => spawnSync(cmd[0]!, cmd.slice(1), { cwd, stdio: "inherit", env: process.env, shell: process.platform === "win32" });
  console.log(`기준 worktree: ${dir}`);
  if (sh(["git", "worktree", "add", "--detach", dir, commit]).status !== 0) return 1;
  let code = 1;
  try {
    fs.cpSync("scripts", path.join(dir, "scripts"), { recursive: true });
    if (!skipInstall && sh([NPX, "npm", "ci"], dir).status !== 0 && sh(["npm", "ci"], dir).status !== 0) throw new Error("npm ci 실패(--skip-install로 미리 설치한 경우만 건너뛴다)");
    const env = { ...process.env, NEXT_PUBLIC_DESIGN_V4: "off" };
    const run = (cmd: string[], extra: Record<string, string> = {}) => spawnSync(cmd[0]!, cmd.slice(1), { cwd: dir, stdio: "inherit", env: { ...env, ...extra }, shell: process.platform === "win32" }).status;
    if (run([NPX, "tsx", "scripts/check-v4-off.ts", "--write"]) !== 0) throw new Error("export 기준 저장 실패");
    if (run([NPX, "tsx", "scripts/check-v4-off-live.tsx", "--write"], { OUT: SNAP_LIVE }) !== 0) throw new Error("라이브 기준 저장 실패");
    for (const p of [SNAP_EXPORT, SNAP_LIVE]) { fs.rmSync(p, { recursive: true, force: true }); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.cpSync(path.join(dir, p), p, { recursive: true }); }
    console.log(`기준 저장 완료: ${SNAP_EXPORT}, ${SNAP_LIVE} (커밋 ${commit})`);
    code = 0;
  } catch (e) { console.error(String(e)); }
  sh(["git", "worktree", "remove", "--force", dir]);
  return code;
}

async function main() {
  const argv = process.argv.slice(2);
  const mb = argv.indexOf("--make-baseline");
  if (mb >= 0) { const c = argv[mb + 1]; if (!c) { console.error("사용법: --make-baseline <커밋>"); process.exit(2); } process.exit(makeBaseline(c, argv.includes("--skip-install"))); }
  const o = parseArgs(argv);
  const results = await runAll(o);
  if (!o.dryRun) console.log(`\n요약: ${path.join(o.out, "summary.md")}`);
  process.exit(results.some((r) => r.status === "불합격") ? 1 : 0);
}
if (process.argv[1] && /pc-verify\.ts$/.test(process.argv[1].replace(/\\/g, "/"))) void main();
