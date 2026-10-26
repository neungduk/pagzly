/**
 * 회귀 — 447차 1 PC 원커맨드 검증 도구. ① 단계 목록·순서, ② 건너뜀 규칙(기준 스냅샷 없음·세션 없음·--skip-*·--only), ③ 인자 해석,
 * ④ 세션 탐색(주입), ⑤ 환경 점검은 존재 여부(boolean)만 돌려줌, ⑥ 요약 표, ⑦ 소스 정적 검사: .env 읽기·값 출력 없음. 호출 0·서버 0.
 */
import fs from "node:fs";
import { ENV_NAMES, envReport, parseArgs, planSteps, summaryMd, type Result } from "../pc-verify";
import { findSessions } from "../pc-sessions-find";

export const name = "PC 검증 도구 — 단계 순서·건너뜀 규칙·세션 탐색·환경값 비출력(.env 읽지 않음)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) fails.push(m); };
  const o = parseArgs(["--date=2026-01-02"]);
  ok(o.out === "review/pc-verify-2026-01-02", `기본 출력 경로: ${o.out}`);

  const all = planSteps(o, () => true, 3);
  ok(all.map((s) => s.id).join(",") === "env,tsc,regression,off-export,off-live,off-section,build,sessions,smoke,predeploy,legibility,exposure,a11y,size,dedupe,fuzz,dev,capture", `단계 순서: ${all.map((s) => s.id)}`);
  ok(all.filter((s) => s.id !== "dev").every((s) => !s.skip), "모두 있을 때 건너뜀 없음(dev는 --full에서만)");
  ok(!!all.find((s) => s.id === "dev")?.skip && !planSteps(parseArgs(["--full"]), () => true, 3).find((s) => s.id === "dev")?.skip, "라이브 하네스는 --full에서만");
  ok(planSteps(parseArgs(["--full"]), () => true, 3).find((s) => s.id === "fuzz")!.cmd.includes("--n=200"), "--full 퍼징은 200개");
  ok(all.find((s) => s.id === "smoke")?.needs?.includes("build") === true, "smoke는 build 뒤");

  const noBase = planSteps(o, (p) => !p.includes("snap-438"), 3);
  ok(!!noBase.find((s) => s.id === "off-export")?.skip && !!noBase.find((s) => s.id === "off-live")?.skip, "기준 스냅샷 없으면 off 단계 건너뜀");
  ok(!!noBase.find((s) => s.id === "off-export")?.skip?.includes("--make-baseline"), "건너뜀 안내에 --make-baseline");
  ok(!!planSteps(o, (p) => !p.includes("snap-section"), 3).find((s) => s.id === "off-section")?.skip?.includes("--write"), "섹션 단독 기준이 없으면 4c 건너뜀 + 만드는 명령 안내");
  ok(!!planSteps(o, () => true, 0).find((s) => s.id === "sessions")?.skip, "세션 없으면 6단계 건너뜀");
  const flags = planSteps(parseArgs(["--skip-capture", "--skip-build", "--skip-smoke"]), () => true, 1);
  ok(["capture", "build", "smoke"].every((id) => !!flags.find((s) => s.id === id)?.skip), "--skip-* 건너뜀");
  const only = planSteps(parseArgs(["--only=tsc"]), () => true, 1);
  ok(only.filter((s) => !s.skip).map((s) => s.id).join() === "tsc", "--only는 지정 단계만");
  ok(parseArgs(["--dry-run"]).dryRun, "--dry-run 해석");

  // 세션 탐색(주입)
  const found = findSessions("review", (p) => p === "review/411-live/fashion/session.json", () => ["review/500-live/a/session.json", "review/411-live/fashion/session.json"]);
  ok(found.length === 2 && found[0][0] === "s411" && found[1][0].startsWith("x-"), `세션 탐색: ${JSON.stringify(found)}`);
  ok(findSessions("review", () => false, () => []).length === 0, "없으면 빈 목록");

  // 환경 점검: boolean만
  const r = envReport(() => true, { NEXT_PUBLIC_SUPABASE_URL: "secret-dummy-value", NEXT_PUBLIC_SITE_URL: "" } as NodeJS.ProcessEnv);
  ok(r.env.length === ENV_NAMES.length && r.env.every((e) => typeof e.present === "boolean"), "환경 항목은 boolean");
  ok(r.env.find((e) => e.name === "NEXT_PUBLIC_SUPABASE_URL")?.present === true && r.env.find((e) => e.name === "NEXT_PUBLIC_SITE_URL")?.present === false, "존재 판정");
  ok(!JSON.stringify(r).includes("secret-dummy-value"), "환경값이 보고에 새지 않음");
  const results: Result[] = all.map((s) => ({ step: s, status: "합격", ms: 1000, code: 0, log: `logs/${s.id}.log`, note: "" }));
  const md = summaryMd(o, results, r);
  ok(!md.includes("secret-dummy-value") && md.includes("| 단계 | 결과 | 시간 | 종료 코드 | 명령 | 로그 |") && md.includes("눈으로 볼 체크리스트"), "요약 표·체크리스트");

  // 정적 검사: .env 읽기·값 출력 없음
  for (const f of ["scripts/pc-verify.ts", "scripts/pc-verify-sessions.ts", "scripts/pc-verify-eye.ts", "scripts/pc-sessions-find.ts", "scripts/pc-verify-dev.ts"]) {
    const src = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    ok(!/readFileSync\([^)]*\.env|dotenv|loadEnvConfig|openSync\([^)]*\.env|["'`][^"'`]*\.env(\.local|\.production)?["'`]/.test(src), `${f}: .env 파일을 열지 않아야 함`);
    ok(!/console\.log\([^)]*process\.env\[|console\.log\([^)]*process\.env\./.test(src), `${f}: 환경값 출력 금지`);
  }
  return fails;
}
