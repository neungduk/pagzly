/**
 * 회귀 — 452차 4 배포 전 정적 점검 도구. ① 도구 소스가 `.env*` 파일을 열지 않는다(readFileSync 대상에 env 경로 없음, env 파일은 건너뜀)
 * ② 마이그레이션 4개·플래그 기본값·결제/인증 경로 변경 검사 함수가 합격 ③ 비밀값 검사가 값을 출력하지 않는다(파일:줄 + 패턴 이름만) ④ 환경변수 목록 문서에 값(`=`)이 없다.
 */
import fs from "node:fs";
import { SECRET_PATTERNS, checkFlagDocs, checkMigrations, checkSecrets, collectEnvNames, RISK_ENV_NAMES } from "../predeploy-static";

export const name = "배포 전 정적 점검 — env 파일 미열람·마이그레이션 4개·플래그 일치·비밀값 출력 없음";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const src = fs.readFileSync("scripts/predeploy-static.ts", "utf8");
  if (/readFileSync\(\s*["'`][^"'`]*\.env/.test(src)) fails.push("도구가 .env 경로를 직접 읽음");
  if (!/isEnvFile\(f\)/.test(src)) fails.push("env 파일을 건너뛰는 검사가 없음");
  for (const c of [checkMigrations(), checkFlagDocs()]) if (c.status !== "합격") fails.push(`${c.title}: ${c.status} — ${c.detail.slice(0, 2).join(" / ")}`);
  const sec = checkSecrets();
  if (sec.status !== "합격") fails.push(`비밀값 패턴 ${sec.detail.length - 1}건: ${sec.detail.slice(1, 4).join(" / ")}`);
  for (const d of sec.detail) if (/["'][A-Za-z0-9+/_-]{32,}["']/.test(d)) fails.push("비밀값 검사 출력에 값이 섞임");
  if (!SECRET_PATTERNS.length) fails.push("비밀값 패턴 없음");
  const names = collectEnvNames();
  for (const r of RISK_ENV_NAMES) if (!names.has(r)) fails.push(`${r} 참조 없음`);
  const list = fs.existsSync("docs/required-env-names.md") ? fs.readFileSync("docs/required-env-names.md", "utf8") : "";
  if (!list) fails.push("docs/required-env-names.md 없음");
  if (/^\|\s*`[A-Z_]+`\s*\|[^|]*=/m.test(list) || /[A-Z_]{4,}=[^\s|]+/.test(list)) fails.push("환경변수 목록에 값이 들어감");
  return fails;
}
