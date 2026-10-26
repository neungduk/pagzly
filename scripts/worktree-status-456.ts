/**
 * 456차 3 — 작업 폴더 정리 현황(읽기 전용). `git status`의 추적 수정·추적 삭제·미추적을 디렉터리별로 집계해 표로 쓴다. 파일 내용은 열지 않고(크기·이름만), 아무것도 지우지 않는다.
 *   npx tsx scripts/worktree-status-456.ts [--out=review/456-verify/worktree-status.md]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const OUT = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "review/456-verify/worktree-status.md";
const git = (args: string[], max = 256) => spawnSync("git", args, { encoding: "utf8", maxBuffer: max * 1024 * 1024 }).stdout ?? "";

type Kind = "추적 수정" | "추적 삭제" | "미추적";
type Item = { kind: Kind; file: string; size: number };

const unq = (s: string) => (s.startsWith('"') ? JSON.parse(s.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))) : s);
// 따옴표로 감싼 한글 경로는 8진 이스케이프 → 바이트열이라 Buffer로 복원
function decode(raw: string): string {
  if (!raw.startsWith('"')) return raw;
  const inner = raw.slice(1, -1);
  const bytes: number[] = [];
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "\\") {
      const m = /^[0-7]{3}/.exec(inner.slice(i + 1));
      if (m) { bytes.push(parseInt(m[0], 8)); i += 3; continue; }
      const c = inner[i + 1];
      bytes.push((c === "t" ? "\t" : c === "n" ? "\n" : c)!.charCodeAt(0)); i += 1; continue;
    }
    for (const b of Buffer.from(inner[i]!)) bytes.push(b);
  }
  return Buffer.from(bytes).toString("utf8");
}
void unq;

const items: Item[] = [];
for (const line of git(["status", "--porcelain=v1", "-uall"]).split("\n").filter(Boolean)) {
  const x = line.slice(0, 2);
  const file = decode(line.slice(3));
  const kind: Kind = x === "??" ? "미추적" : x.includes("D") ? "추적 삭제" : "추적 수정";
  let size = 0;
  try {
    if (kind === "추적 삭제") size = Number(spawnSync("git", ["cat-file", "-s", `HEAD:${file}`], { encoding: "utf8" }).stdout.trim()) || 0;
    else size = fs.statSync(file).size;
  } catch { /* 없음 */ }
  items.push({ kind, file, size });
}

const top = (f: string): string => {
  const p = f.split("/");
  if (p[0] === "review" && p.length > 2) return `review/${p[1]}`;
  if (p.length > 2) return `${p[0]}/${p[1]}`;
  return p.length > 1 ? p[0]! : "(루트)";
};

function nature(dir: string, files: string[]): string {
  const d = dir.toLowerCase();
  if (/^review\/.*(live|verify|screens|bench|qa|export|captures|uploads|rhythm)/.test(d) || d.startsWith("review")) return "과거 라운드 산출물·캡처·검증 결과(review/*, 커밋 금지 구역)";
  if (d.startsWith("scripts")) return files.every((f) => /scripts\/_/.test(f)) ? "임시 스크립트(_NNN)" : "스크립트(일부 임시)";
  if (d.startsWith("loop")) return "루프 작업 파일(커밋 금지 구역)";
  if (d.startsWith("public")) return "공개 정적 파일(사진·폰트 등)";
  if (d.startsWith("docs")) return "문서";
  if (/^(app|lib|components|supabase)/.test(d)) return "실제 코드·마이그레이션 — 확인 필요";
  if (/\.(log|txt)$/.test(files[0] ?? "")) return "로그";
  return "설정·루트 파일 — 확인 필요";
}

const fmt = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)}MB` : `${Math.round(b / 1024)}KB`);
const sum = (a: Item[]) => a.reduce((s, i) => s + i.size, 0);

const lines: string[] = ["# 456차 3 — 작업 폴더 정리 현황 (읽기 전용, 삭제·적용 없음)", ""];
lines.push("| 구분 | 건수 | 용량 |", "|---|---|---|");
for (const k of ["추적 수정", "추적 삭제", "미추적"] as Kind[]) { const a = items.filter((i) => i.kind === k); lines.push(`| ${k} | ${a.length} | ${fmt(sum(a))} |`); }
lines.push("");

for (const k of ["추적 수정", "추적 삭제", "미추적"] as Kind[]) {
  const by = new Map<string, Item[]>();
  for (const i of items.filter((x) => x.kind === k)) { const d = top(i.file); by.set(d, [...(by.get(d) ?? []), i]); }
  lines.push(`## ${k} — 디렉터리별`, "", "| 디렉터리 | 건수 | 용량 | 대표 파일 5개 | 성격 |", "|---|---|---|---|---|");
  for (const [d, a] of [...by].sort((x, y) => y[1].length - x[1].length)) {
    lines.push(`| ${d} | ${a.length} | ${fmt(sum(a))} | ${a.slice(0, 5).map((i) => path.basename(i.file)).join(", ").replace(/\|/g, "/")} | ${nature(d, a.map((i) => i.file))} |`);
  }
  lines.push("");
}

// 임시 파일 후보(저장소 안 + 바깥 형제 폴더)
const temp = items.filter((i) => /(^|\/)scripts\/_|(^|\/)_[0-9]+-|\.tmp\.|\/tmp-|-npmci\.log$|next-dev-.*\.log$|(^|\/)reg[0-9]*\.log$|(^|\/)pcv[0-9]*.*\.log$/.test(i.file) && i.kind === "미추적");
lines.push("## 임시 파일 — 삭제해도 되는 후보 (삭제하지 않음)", "", `저장소 안 미추적 ${temp.length}개(${fmt(sum(temp))}):`, "");
for (const t of temp) lines.push(`- ${t.file} (${fmt(t.size)})`);
const outside = fs.readdirSync("..").filter((n) => /^(wt\d*|.*-npmci\.log|next-dev-.*\.log|reg\d*\.log|pcv\d*.*\.log|status\d*\.txt)$/.test(n));
lines.push("", "저장소 바깥 형제 폴더(`..\\`)의 임시 파일:", ...outside.map((n) => `- ..\\${n}`), "");

// 추적 삭제 파일이 과거 어느 커밋에서 지워졌는지(이미 HEAD에서 제거됐는지) — HEAD에 있는 파일만 "삭제" 상태가 된다
const del = items.filter((i) => i.kind === "추적 삭제");
const delTop = new Set(del.map((d) => top(d.file)));
lines.push("## 추적 삭제 상세", "", `삭제 상태 ${del.length}개는 모두 현재 HEAD(cloud-work)에 존재하는 파일이 작업 폴더에서만 없는 것이다. 디렉터리 ${delTop.size}곳.`, "");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`저장 ${OUT}: 수정 ${items.filter((i) => i.kind === "추적 수정").length} · 삭제 ${del.length} · 미추적 ${items.filter((i) => i.kind === "미추적").length}`);
