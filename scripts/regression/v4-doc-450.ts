/**
 * 회귀 — 450차 5 v4 총정리 문서 정적 검사. docs/v4-overview.md가 있고, 문서가 말하는 NEXT_PUBLIC_* 플래그가 코드에 실제로 있으며(기본값 방향 포함),
 * 문서가 가리키는 파일·스크립트 경로가 저장소에 있고, 롤백 단계 3개와 "미검증" 표시가 남아 있는지 본다.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const name = "v4 총정리 문서 — 플래그 이름이 코드와 일치·참조 경로 존재·롤백 3단계";

/** 저장소에 추적되는 파일 집합(git ls-files). 작업 폴더에만 있는 파일이 통과를 가리지 않게 한다. git을 못 쓰면 null */
const trackedFiles = (): Set<string> | null => {
  const r = spawnSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? new Set(r.stdout.split(/\r?\n/).filter(Boolean)) : null;
};

const walk =(dir: string, out: string[] = []): string[] => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "review"].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs)$/.test(f.name)) out.push(p);
  }
  return out;
};

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const file = "docs/v4-overview.md";
  if (!fs.existsSync(file)) return [`${file} 없음`];
  const md = fs.readFileSync(file, "utf8");
  const src = ["lib", "components", "app"].flatMap((d) => (fs.existsSync(d) ? walk(d) : [])).map((p) => fs.readFileSync(p, "utf8")).join("\n");
  const flags = new Set([...md.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)].map((m) => m[0]));
  for (const must of ["NEXT_PUBLIC_DESIGN_V4", "NEXT_PUBLIC_HERO_V2", "NEXT_PUBLIC_DESIGN_POLISH"]) if (!flags.has(must)) fails.push(`문서에 ${must} 없음`);
  for (const f of flags) if (!src.includes(`process.env.${f}`)) fails.push(`문서의 ${f}가 코드(process.env.${f})에 없음`);
  // 기본값 방향: v4·polish·hero는 off일 때만 꺼짐, HERO_STAGE는 on일 때만 켜짐
  const code = (f: string, re: RegExp) => { if (!re.test(src)) fails.push(`${f} 기본값 표기와 코드가 다름`); };
  code("DESIGN_V4", /NEXT_PUBLIC_DESIGN_V4 !== "off"/);
  code("DESIGN_POLISH", /NEXT_PUBLIC_DESIGN_POLISH !== "off"/);
  code("HERO_V2", /NEXT_PUBLIC_HERO_V2 !== "off" && process\.env\.NEXT_PUBLIC_HERO_V2 !== "prev"/);
  code("HERO_STAGE", /NEXT_PUBLIC_HERO_STAGE === "on"/);
  // 참조 경로
  const paths = new Set([...md.matchAll(/`((?:lib|scripts|docs|components|review)\/[A-Za-z0-9_./-]+?)`/g)].map((m) => m[1]!));
  const tracked = trackedFiles();
  for (const p of paths) {
    const base = p.replace(/\(.*$/, "");
    if (/\/$/.test(base) || /\*/.test(base)) continue;
    const candidates = [base, `${base}.ts`, `${base}.tsx`];
    if (/(^|\/)(_[^/]*|[^/]*\.tmp[^/]*)$/.test(base)) fails.push(`문서가 임시·로컬 전용 이름을 가리킴: ${p}`);
    else if (!candidates.some((c) => (tracked ? tracked.has(c) || [...tracked].some((t) => t.startsWith(`${c}/`)) : fs.existsSync(c)))) fails.push(`문서의 경로가 저장소(git 추적)에 없음: ${p}`);
  }
  for (const s of ["1 히어로만 이전 사양", "2 v4 전체 off", "3 이전 상태"]) if (!md.includes(s)) fails.push(`롤백 단계 누락: ${s}`);
  if (!md.includes("미검증")) fails.push("미검증 표시가 없음");
  return fails;
}
