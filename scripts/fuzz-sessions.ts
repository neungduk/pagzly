/**
 * 448차 2-1 — 입력 퍼저(결정적). 기존 픽스처 21종을 모체로 필드 단위 극단 변형을 만든다. 새 한국어 문장은 만들지 않는다:
 * 기존 문구를 자르기·반복·줄바꿈 폭주·비움으로만 바꾸고, 영문·숫자·특수문자 이름은 기존 브랜드·가격·구두점에서만 얻는다.
 *   import { fuzzCases } from "./fuzz-sessions"; fuzzCases(200) → [{ id, base, ops, session }]
 */
import fs from "node:fs";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 저장 세션 JSON
export type Session = Record<string, any>;
export type FuzzCase = { id: string; base: string; ops: string[]; session: Session };

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const repeatTo = (s: string, n: number): string => { if (!s) return s; let o = s; while ([...o].length < n) o += ` ${s}`; return o; };

type StrOp = { name: string; f: (s: string, r: () => number) => string };
const STR_OPS: StrOp[] = [
  { name: "빈 글", f: () => "" },
  { name: "공백만", f: () => "   " },
  { name: "한 글자", f: (s) => [...s][0] ?? "" },
  { name: "한 줄(첫 문장)", f: (s) => s.split(/[\n.。]/)[0]!.trim() },
  { name: "3000자 반복", f: (s) => repeatTo(s, 3000) },
  { name: "줄바꿈 폭주", f: (s) => s.split(/\s+/).join("\n").concat("\n\n\n").repeat(3) },
  { name: "60자 이상", f: (s) => repeatTo(s, 64) },
];

function leaves(o: unknown, p: Array<string | number> = [], out: Array<Array<string | number>> = []): Array<Array<string | number>> {
  // 고지 문구(AI 생성 안내)는 불변 — 퍼저가 비우지 않는다
  if (o && typeof o === "object" && !Array.isArray(o) && (o as { type?: unknown }).type === "ai_disclosure") return out;
  if (typeof o === "string") { if (p.length && !/^(type|slot|kind|layout|imagePosition|variant|id|icon|style|tone|mood|tag)$/i.test(String(p[p.length - 1])) && o.trim().length > 2) out.push(p); }
  else if (Array.isArray(o)) o.forEach((v, i) => leaves(v, [...p, i], out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) leaves(v, [...p, k], out);
  return out;
}
const getAt = (o: Session, p: Array<string | number>): unknown => p.reduce<unknown>((a, k) => (a as Session)?.[k as never], o);
const setAt = (o: Session, p: Array<string | number>, v: unknown): void => { const parent = getAt(o, p.slice(0, -1)) as Session; parent[p[p.length - 1] as never] = v as never; };
function arrays(o: unknown, p: Array<string | number> = [], out: Array<Array<string | number>> = []): Array<Array<string | number>> {
  if (Array.isArray(o)) { if (p.length && o.length && typeof o[0] === "object") out.push(p); o.forEach((v, i) => arrays(v, [...p, i], out)); }
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) arrays(v, [...p, k], out);
  return out;
}
const resize = <T,>(xs: T[], n: number): T[] => (n <= 0 ? [] : Array.from({ length: n }, (_, i) => structuredClone(xs[i % xs.length]!)));

type Op = { name: string; apply: (s: Session, r: () => number) => void };
const OPS: Op[] = [
  { name: "제품명 1글자", apply: (s) => { s.productName = [...String(s.productName)][0] ?? ""; } },
  { name: "제품명 60자 이상", apply: (s) => { s.productName = repeatTo(String(s.productName), 64); } },
  { name: "제품명 영문만(브랜드)", apply: (s) => { s.productName = String(s.brandName || "ABC").toUpperCase(); } },
  { name: "제품명 한영 혼합", apply: (s) => { s.productName = `${s.productName} ${String(s.brandName || "ABC").toUpperCase()}`; } },
  { name: "제품명 숫자만(가격)", apply: (s) => { s.productName = String(s.price ?? 12345); } },
  { name: "제품명 특수문자", apply: (s) => { s.productName = `<${s.productName}> & "'`; } },
  { name: "제품명 공백", apply: (s) => { s.productName = "   "; } },
  { name: "브랜드 비움", apply: (s) => { s.brandName = ""; } },
  { name: "브랜드 60자 이상", apply: (s) => { s.brandName = repeatTo(String(s.brandName || "ABC"), 64); } },
  { name: "가격 없음", apply: (s) => { delete s.price; } },
  { name: "가격 매우 큼", apply: (s) => { s.price = 99999999999; } },
  { name: "가격 0", apply: (s) => { s.price = 0; } },
  { name: "이미지 0장", apply: (s) => { s.imageUrls = []; if (s.generated) s.generated.imageUrls = []; s.imageOrigins = []; s.imageRoles = []; } },
  { name: "이미지 1장", apply: (s) => { s.imageUrls = (s.imageUrls ?? []).slice(0, 1); s.imageOrigins = (s.imageOrigins ?? []).slice(0, 1); s.imageRoles = (s.imageRoles ?? []).slice(0, 1); } },
  { name: "이미지 20장", apply: (s) => { const u = s.imageUrls ?? []; if (u.length) { s.imageUrls = resize(u, 20); s.imageOrigins = resize(s.imageOrigins ?? ["original"], 20); s.imageRoles = resize(s.imageRoles ?? ["other"], 20); } } },
  { name: "키워드 0개", apply: (s) => { s.keyFeatures = ""; } },
  { name: "키워드 30개", apply: (s) => { s.keyFeatures = repeatTo(String(s.keyFeatures || "촉촉"), 30 * 4).split(/[,\s]+/).slice(0, 30).join(", "); } },
  { name: "성분 비움", apply: (s) => { s.ingredients = ""; } },
  { name: "섹션 하나 누락", apply: (s, r) => { const a = s.generated.sections; if (a.length > 2) a.splice(1 + Math.floor(r() * (a.length - 1)), 1); } },
  { name: "섹션 절반 누락", apply: (s, r) => { s.generated.sections = s.generated.sections.filter((_: unknown, i: number) => i === 0 || r() > 0.5); } },
  { name: "섹션 순서 섞기", apply: (s, r) => { const [h, ...rest] = s.generated.sections; for (let i = rest.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; } s.generated.sections = [h, ...rest]; } },
  { name: "섹션 5개만", apply: (s) => { s.generated.sections = s.generated.sections.slice(0, 5); } },
  { name: "히어로만", apply: (s) => { s.generated.sections = s.generated.sections.slice(0, 1); } },
  { name: "본문 글 변형", apply: (s, r) => { const ls = leaves(s.generated.sections); for (let k = 0; k < 3 && ls.length; k += 1) { const p = pick(r, ls); const op = pick(r, STR_OPS); setAt(s.generated, ["sections", ...p], op.f(String(getAt(s.generated.sections as unknown as Session, p)), r)); } } },
  { name: "항목 수 0·1·20", apply: (s, r) => { const as = arrays(s.generated.sections); if (!as.length) return; const p = pick(r, as); const n = pick(r, [0, 1, 20] as const); const cur = getAt(s.generated.sections as unknown as Session, p) as unknown[]; setAt(s.generated, ["sections", ...p], resize(cur, n)); } },
  { name: "모든 글 비움", apply: (s) => { for (const p of leaves(s.generated.sections)) setAt(s.generated, ["sections", ...p], ""); } },
  { name: "히어로 문구 3000자", apply: (s) => { const h = s.generated.sections[0]; if (h?.headline) h.headline = repeatTo(h.headline, 300); if (h?.subheadline) h.subheadline = repeatTo(h.subheadline, 3000); } },
];

export function baseFixtures(): Array<[string, string]> {
  const dir = "scripts/fixtures";
  return fs.readdirSync(dir).filter((f) => f.startsWith("archetype-") && f.endsWith(".json")).sort().map((f) => [`fx-${f.slice(10, -5)}`, path.join(dir, f)] as [string, string]);
}

/** 시드 고정 퍼징 사례 n개(앞 30개는 회귀용 부분집합) */
export function fuzzCases(n = 200, seed = 448): FuzzCase[] {
  const r = rng(seed);
  const bases = baseFixtures();
  const out: FuzzCase[] = [];
  for (let i = 0; i < n; i += 1) {
    const [bid, file] = bases[i % bases.length]!;
    const session = JSON.parse(fs.readFileSync(file, "utf8")) as Session;
    const k = 1 + Math.floor(r() * 3);
    const ops: string[] = [];
    for (let j = 0; j < k; j += 1) {
      const op = pick(r, OPS);
      try { op.apply(session, r); ops.push(op.name); } catch { ops.push(`${op.name}(적용 불가)`); }
    }
    out.push({ id: `fz${String(i).padStart(3, "0")}-${bid.slice(3)}`, base: bid, ops, session });
  }
  return out;
}
