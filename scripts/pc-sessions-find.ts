/**
 * 447차 1 — 저장 세션(session.json) 자동 탐색. 알려진 6종 경로 + `review/*-live/**` · `review/pexels-*` 아래 session.json(깊이 3까지).
 * fs만 쓴다(무거운 모듈을 불러오지 않아 pc-verify 계획 단계에서 가볍게 부른다). 값은 읽지 않고 경로만 모은다.
 */
import fs from "node:fs";
import path from "node:path";

export const KNOWN_SESSIONS: Array<[string, string]> = [
  ["s411", "review/411-live/fashion/session.json"],
  ["s414", "review/414-live/fashion/session.json"],
  ["s417", "review/417-live/fashion/session.json"],
  ["s418", "review/418-live/beauty/session.json"],
  ["s422", "review/422-live/beauty/session.json"],
  ["selec", "review/pexels-electronics-detail/session.json"],
];

function walk(dir: string, depth: number, out: string[]): void {
  if (depth < 0) return;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth - 1, out);
    else if (e.name === "session.json") out.push(p.split(path.sep).join("/"));
  }
}

/** [id, 경로] 목록. 알려진 6종이 먼저, 그 밖에 찾은 것은 경로에서 id를 만든다 */
export function findSessions(root = "review", exists: (p: string) => boolean = fs.existsSync, listDir?: (d: string, depth: number) => string[]): Array<[string, string]> {
  const found: Array<[string, string]> = KNOWN_SESSIONS.filter(([, p]) => exists(p));
  const known = new Set(found.map(([, p]) => p));
  const extra: string[] = [];
  if (listDir) extra.push(...listDir(root, 3));
  else for (const d of safeDirs(root)) if (/-live$|^pexels-/.test(d)) walk(path.join(root, d), 3, extra);
  for (const p of extra.sort()) if (!known.has(p)) { found.push([`x-${p.replace(/^review\//, "").replace(/\/session\.json$/, "").replace(/[^\w가-힣-]+/g, "_")}`, p]); known.add(p); }
  return found;
}
function safeDirs(root: string): string[] {
  try { return fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
}
