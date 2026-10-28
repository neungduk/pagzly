/** 회귀 — 461차 무거운 검증 도구 가드(파일만 읽음, 브라우저·네트워크 없음). */
import fs from "node:fs";
import path from "node:path";
import { HEAVY_BLOCK_EXIT_CODE, assertHeavyAllowed, assertHeavyEntry, heavyDecision } from "../lib/heavy-guard";

export const name = "무거운 도구 가드 — 전수 적용·환경변수 판단·변수 없으면 허용·진입 파일만 검사";

/** 가드 대상에서 제외하는 파일(이유 명시) */
const EXCEPTIONS: Record<string, string> = {
  "scripts/lib/heavy-guard.ts": "가드 자체",
  // 464차 — 말뭉치 export 문자열만 읽는 지표 도구. 색상군 계산에 순수 함수 budgetOf만 가져오며(color-budget이 브라우저 도구라 닫힌 집합에 걸림) 브라우저를 띄우지 않는다
  "scripts/variety-metrics-463.ts": "문자열 전용 지표 도구(브라우저 없음)",
  // 466차 — 463 도구의 문자열 함수만 가져와 진한 면·히어로·정렬을 읽는 거시 지표 도구(브라우저 없음)
  "scripts/variety-metrics-466.ts": "문자열 전용 지표 도구(브라우저 없음)",
  // 467차 — 다이나믹 지표(말뭉치 export 문자열만 읽음)
  "scripts/dynamics-metrics-467.ts": "문자열 전용 지표 도구(브라우저 없음)",
  "scripts/dynamics-report-467.ts": "문자열 전용 지표 보고 도구(브라우저 없음)",
  // 468차 — 지표(문자열 전용)
  "scripts/dynamics-metrics-468.ts": "문자열 전용 지표 도구(브라우저 없음)",
  "scripts/dynamics-report-468.ts": "문자열 전용 지표 보고 도구(브라우저 없음)",
  "scripts/dynamics-metrics-469.ts": "문자열 전용 지표 도구(브라우저 없음)",
  "scripts/dynamics-report-469.ts": "문자열 전용 지표 보고 도구(브라우저 없음)",
};

function listTs(dir: string): string[] {
  return fs.readdirSync(dir).filter((n) => n.endsWith(".ts")).map((n) => path.posix.join(dir, n));
}

/** playwright/chromium을 쓰거나, 그런 파일을 가져오는 scripts/ 직속·lib 파일(회귀 폴더 제외)의 닫힌 집합 */
function heavyFiles(): string[] {
  const files = [...listTs("scripts"), ...listTs("scripts/lib")];
  const src = new Map(files.map((p) => [p, fs.readFileSync(p, "utf8")]));
  const heavy = new Set(files.filter((p) => /playwright|chromium/.test(src.get(p)!)));
  const imports = (p: string): string[] => [...src.get(p)!.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)].map((m) => path.posix.normalize(path.posix.join(path.posix.dirname(p), m[1]!)) + ".ts");
  for (let changed = true; changed;) {
    changed = false;
    for (const p of files) if (!heavy.has(p) && imports(p).some((t) => heavy.has(t))) { heavy.add(p); changed = true; }
  }
  return [...heavy].sort();
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };

  // ① 전수 적용
  const list = heavyFiles();
  ok(list.length >= 100, `무거운 도구 목록이 비정상적으로 짧음(${list.length})`);
  for (const p of list) {
    if (EXCEPTIONS[p]) continue;
    const s = fs.readFileSync(p, "utf8");
    if (!/assertHeavyEntry\(/.test(s)) f.push(`${p}: 가드 없음`);
    else if (!/heavy-guard"/.test(s)) f.push(`${p}: 가드 import 없음`);
  }
  for (const key of ["pc-verify", "launch-smoke", "png-compare", "fuzz-live", "fuzz-check", "eye-capture", "live-capture", "section-sheet"]) {
    if (!list.includes(`scripts/${key}.ts`)) f.push(`전수 목록에 ${key} 없음`);
  }
  // 회귀 폴더는 브라우저를 쓰지 않는다(CI 정적 회귀가 가드에 걸리면 안 됨)
  for (const p of listTs("scripts/regression")) if (/from\s+["']playwright["']|require\(["']playwright/.test(fs.readFileSync(p, "utf8"))) f.push(`${p}: 회귀가 playwright를 직접 가져옴`);

  // ② 가드가 세 변수와 해제 변수를 검사
  const g = fs.readFileSync("scripts/lib/heavy-guard.ts", "utf8");
  for (const v of ["CLAUDE_CODE_REMOTE", "CI", "PZ_PHONE_SESSION", "PZ_ALLOW_HEAVY"]) if (!g.includes(v)) f.push(`가드가 ${v}를 검사하지 않음`);
  ok(HEAVY_BLOCK_EXIT_CODE === 2, "종료 코드가 2가 아님");

  // ③ 함수 단위 동작(주입한 env만 사용)
  ok(heavyDecision({}).allowed, "변수 없는데 거부(집 PC를 막음)");
  ok(heavyDecision({ CI: "false", CLAUDE_CODE_REMOTE: "false", PZ_PHONE_SESSION: "0" }).allowed, "꺼진 값을 켜진 것으로 봄");
  for (const env of [{ CLAUDE_CODE_REMOTE: "true" }, { CI: "true" }, { PZ_PHONE_SESSION: "1" }]) ok(!heavyDecision(env).allowed, `${JSON.stringify(env)} 허용됨`);
  ok(heavyDecision({ CI: "true", PZ_ALLOW_HEAVY: "1" }).allowed, "PZ_ALLOW_HEAVY=1 이 해제하지 못함");
  ok(!heavyDecision({ CI: "true", PZ_ALLOW_HEAVY: "0" }).allowed, "PZ_ALLOW_HEAVY=0 이 해제함");
  let code = -1; const errs: string[] = [];
  const origErr = console.error; console.error = (...a: unknown[]) => { errs.push(a.join(" ")); };
  try { assertHeavyAllowed("t", { CI: "true" }, ((c: number) => { code = c; return undefined as never; }) as (c: number) => never); } finally { console.error = origErr; }
  ok(code === 2 && errs.length === 1 && !errs[0]!.includes("\n"), `거부 출력/종료 코드 ${code} ${errs.length}`);
  code = -1; assertHeavyAllowed("t", {}, ((c: number) => { code = c; return undefined as never; }) as (c: number) => never);
  ok(code === -1, "허용인데 종료함");
  code = -1; assertHeavyEntry("t", false); ok(code === -1, "진입 파일이 아닌데 검사함");
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
