/**
 * 411차 유료 검증 자동 채점기 (무료 — 파일만 읽는다. 생성 API·.env·dev 서버 모두 건드리지 않는다).
 *
 *   npx tsx scripts/verify-411.ts --session review/411-live/fashion/session.json \
 *     [--summary review/411-live/fashion/summary.json] [--server-log review/411-dev-server.log] \
 *     [--input review/402-input/fashion/product-info.txt] [--out review/411-verify-report.md] [--label 411]
 *
 * 채점 항목(각각 pass / fail / manual + 근거):
 *   1 사이즈 행(입력의 S~XL·2XL이 표에 모두 남는가 — 408차)       2 소재·색상·세탁방법 입력 채움(407차)
 *   3 배경 이미지 생략·배경 비용 0·후보 선택 화면 없음(405차)     4 앱 기록 ↔ 서버 로그 합산(406차)
 *   5 갤러리 착용컷이 앞 칸(406차)                                6 프롬프트 규칙(f6faa97): 자동 판정 + 수동 확인 문장
 * 7번(3팩 캡처)은 scripts/verify-411-capture.ts (dev 서버 필요).
 * 채점기 자체 점검: 404차 세션(XL 누락·소재 확인 필요·배경 0.16)으로 돌리면 1·2·3이 fail이어야 정상이다.
 */
import fs from "node:fs";
import path from "node:path";
import { applyDisplayRules } from "../lib/display-sections";
import { extractLabeledValue } from "../lib/enrich-product-sections";
import { isWornFashionPhoto } from "../lib/fashion-composite-policy";

type Verdict = "pass" | "fail" | "manual";
type Row = { id: string; title: string; verdict: Verdict; evidence: string[] };

const args = process.argv.slice(2);
const arg = (name: string, def?: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const SESSION = arg("--session", "review/411-live/fashion/session.json")!;
const SUMMARY = arg("--summary", path.join(path.dirname(SESSION), "summary.json"))!;
const SERVER_LOG = arg("--server-log");
// 414차: 서버 로그에서 이번 실행 구간만 합산 (--since-line N: N번째 줄 이후 / --since-marker TEXT: 마지막으로 나온 TEXT 줄 이후)
const SINCE_LINE = Number(arg("--since-line", "0")) || 0;
const SINCE_MARKER = arg("--since-marker");
const INPUT = arg("--input", "review/402-input/fashion/product-info.txt")!;
const OUT = arg("--out", "review/411-verify-report.md")!;
const LABEL = arg("--label", "411")!;
const PLACEHOLDER = "판매자 확인 필요";
const KNOWN_DOUBLE_COUNT_USD = 0.026; // 406차: 보호 파일 preCropSourceToProduct가 cost·claudeCost에 같은 값을 넣는 이중집계

const read = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
const readJson = (f: string) => {
  const t = read(f);
  return t ? JSON.parse(t) : null;
};
const clip = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n)}…` : s);

type Section = Record<string, unknown> & { type: string; slot?: string };
const sessionRaw = readJson(SESSION);
if (!sessionRaw) {
  console.error(`세션 파일을 찾을 수 없습니다: ${SESSION}`);
  process.exit(2);
}
const gen = (sessionRaw.generated ?? sessionRaw) as { sections: Section[]; imageUrls?: string[]; imageHashByUrl?: Record<string, string>; imageRoles?: string[]; imageOrigins?: string[] };
const sections = gen.sections;
const roles: string[] = sessionRaw.imageRoles ?? gen.imageRoles ?? [];
const summary = readJson(SUMMARY) as Record<string, unknown> | null;
const inputText = read(INPUT) ?? "";
const rows: Row[] = [];

// ---------- 문장·텍스트 수집(자동 판정용) ----------
function collectTexts(v: unknown, out: string[]) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectTexts(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!/^(imageIndex|imageIndexes|slot|type|layout|id)$/.test(k)) collectTexts(x, out);
}
const allTexts: string[] = [];
sections.forEach((s) => collectTexts(s, allTexts));
const sentences = allTexts.flatMap((t) => t.split(/(?<=[.!?。])\s+|\n+/)).map((x) => x.trim()).filter((x) => x.length >= 8);

// ---------- 1. 사이즈 행 ----------
{
  const sizeSec = sections.find((s) => s.slot === "size_table") as (Section & { rows?: { label: string; value: string }[] }) | undefined;
  const block = /##\s*사이즈별 실측표([\s\S]*?)(?=\n##|\s*$)/.exec(inputText)?.[1] ?? "";
  const expected = [...block.matchAll(/^\s*((?:XXS|XS|S|M|L|XL|[2-5]XL|FREE|프리))\s*[:：]/gim)].map((m) => m[1]!.toUpperCase());
  const labels = (sizeSec?.rows ?? []).map((r) => r.label.trim().toUpperCase());
  const missing = expected.filter((e) => !labels.some((l) => l === e || l.startsWith(`${e} `) || l.startsWith(`${e}(`)));
  const ev = [`입력의 사이즈: ${expected.join(", ") || "(입력에서 못 찾음)"}`, `표의 라벨: ${labels.join(", ") || "(size_table 없음)"}`];
  if (!sizeSec) rows.push({ id: "1", title: "사이즈 행이 표에 모두 남는다(408차)", verdict: "fail", evidence: [...ev, "size_table 섹션이 없음"] });
  else if (expected.length === 0) rows.push({ id: "1", title: "사이즈 행이 표에 모두 남는다(408차)", verdict: "manual", evidence: [...ev, "입력에서 사이즈 목록을 못 읽음 — 사람이 확인"] });
  else rows.push({ id: "1", title: "사이즈 행이 표에 모두 남는다(408차)", verdict: missing.length ? "fail" : "pass", evidence: [...ev, missing.length ? `빠진 행: ${missing.join(", ")}` : "입력 사이즈가 모두 표에 있음", `XL 포함: ${labels.includes("XL")} / 2XL 포함: ${labels.includes("2XL")}(입력에 있을 때만 의미)`] });
}

// ---------- 2. 소재·색상·세탁방법 ----------
{
  const sizeSec = sections.find((s) => s.slot === "size_table") as (Section & { rows?: { label: string; value: string }[] }) | undefined;
  const val = (label: string) => sizeSec?.rows?.find((r) => r.label.trim() === label)?.value?.trim();
  const material = /##\s*소재 혼용률\s*\n([^\n]+)/.exec(inputText)?.[1]?.trim() ?? sessionRaw.ingredients ?? "";
  const color = extractLabeledValue(inputText.replace(/^##\s*(.+)$/gm, "[$1]"), /^(색상|컬러)(\s*옵션)?$/);
  const wash = extractLabeledValue(inputText.replace(/^##\s*(.+)$/gm, "[$1]"), /^(세탁|세탁\s*방법|세탁\s*[·・/]\s*관리)$/);
  const items: Array<[string, string | null | undefined, string | undefined]> = [["소재", material, val("소재")], ["색상", color, val("색상")], ["세탁방법", wash, val("세탁방법")]];
  const ev: string[] = [];
  let fail = false;
  for (const [label, evidence, got] of items) {
    const has = Boolean(evidence);
    const filled = Boolean(got) && got !== PLACEHOLDER;
    if (has && !filled) fail = true;
    ev.push(`${label}: 입력 근거 ${has ? `있음("${clip(String(evidence), 30)}")` : "없음"} → 표 값 "${clip(got ?? "(행 없음)", 40)}" ${has ? (filled ? "OK" : "← 입력으로 채워져야 함") : got === PLACEHOLDER || !got ? "OK(근거 없어 확인 필요)" : "(근거 없는데 채워짐 — 수동 확인)"}`);
  }
  rows.push({ id: "2", title: "소재·색상·세탁방법이 입력으로 채워진다(407차)", verdict: fail ? "fail" : "pass", evidence: ev });
}

// ---------- 3. 배경 이미지 생략 ----------
{
  const pcb = (sessionRaw.photoCostBreakdown ?? {}) as Record<string, number>;
  const req = (summary?.apiRequests ?? {}) as Record<string, number>;
  const picker = summary?.backdropPickerShown;
  const backdropCost = pcb.backdrop ?? 0;
  const skippedFlag = (sessionRaw as { backdropSkipped?: boolean }).backdropSkipped ?? (gen as { backdropSkipped?: boolean }).backdropSkipped;
  const ev = [
    `photoCostBreakdown.backdrop = ${backdropCost} (0이어야 함)`,
    `backdropSkipped 플래그 = ${String(skippedFlag)}(세션에 없을 수 있음 — 서버 로그/비용으로 판정)`,
    `/api/generate-backdrop 호출 수 = ${req["/api/generate-backdrop"] ?? "(summary 없음)"}(호출은 있어도 skip 응답이면 비용 0)`,
    `배경 후보 선택 화면 표시 = ${String(picker)}(false여야 함)`,
  ];
  const fail = backdropCost > 0 || picker === true;
  rows.push({ id: "3", title: "배경 이미지 생략: 비용 0, 후보 선택 화면 없음(405차)", verdict: fail ? "fail" : summary ? "pass" : "manual", evidence: ev });
}

// ---------- 4. 비용 합산 ----------
{
  const app = Number(sessionRaw.generationCost ?? 0);
  const draftText = sessionRaw.draftTextCost;
  const ev = [`앱 기록 generationCost = $${app.toFixed(5)}`, `draftTextCost(초안 DeepSeek) = ${draftText == null ? "(없음)" : `$${Number(draftText).toFixed(5)}`}`, `photoCostBreakdown = ${JSON.stringify(sessionRaw.photoCostBreakdown ?? {})}`];
  let log = SERVER_LOG ? read(SERVER_LOG) : null;
  if (log) {
    let lines = log.split(/\r?\n/);
    if (SINCE_MARKER) {
      const at = lines.map((l, i) => (l.includes(SINCE_MARKER) ? i : -1)).filter((i) => i >= 0).pop();
      if (at != null) lines = lines.slice(at + 1);
      ev.push(at != null ? `서버 로그: 마커 "${SINCE_MARKER}" 이후 ${lines.length}줄만 합산` : `서버 로그: 마커 "${SINCE_MARKER}"를 못 찾아 전체 합산`);
    } else if (SINCE_LINE > 0) {
      lines = lines.slice(SINCE_LINE);
      ev.push(`서버 로그: ${SINCE_LINE}번째 줄 이후 ${lines.length}줄만 합산`);
    }
    log = lines.join("\n");
  }
  if (!log) {
    rows.push({ id: "4", title: "앱 기록 ↔ 서버 로그 합산(406차)", verdict: "manual", evidence: [...ev, SERVER_LOG ? `서버 로그를 못 읽음: ${SERVER_LOG}` : "--server-log 없음 — dev 서버 로그 파일을 지정"] });
  } else {
    const m = new Map<string, number>();
    for (const l of log.split(/\r?\n/)) {
      const x = l.match(/\[cost\] ([^:$]+?)(?: \([^)]*\))?: \$([0-9.]+)/);
      if (!x || /^(draft|product=)/.test(x[1]!)) continue;
      m.set(x[1]!.trim(), (m.get(x[1]!.trim()) ?? 0) + Number(x[2]));
    }
    // 417차: 인포 AI 배경은 서버가 "[info-backdrops] done ... cost=$X" 한 줄로 남긴다(보수적 단가 x 과금 가능 호출, 실제 청구는 Replicate 잔액으로 대조)
    for (const l of log.split(/\r?\n/)) {
      const x = l.match(/\[info-backdrops\] done .*?cost=\$([0-9.]+)/);
      if (x) m.set("info-backdrops(추정 단가)", (m.get("info-backdrops(추정 단가)") ?? 0) + Number(x[1]));
    }
    // 422차: 뷰티 인물 사용 컷도 서버가 "[scene-images] done ... cost=$X" 한 줄로 남긴다(보수적 단가 x 과금 가능 호출)
    for (const l of log.split(/\r?\n/)) {
      const x = l.match(/\[scene-images\] done .*?cost=\$([0-9.]+)/);
      if (x) m.set("scene-images(추정 단가)", (m.get("scene-images(추정 단가)") ?? 0) + Number(x[1]));
    }
    const server = [...m.values()].reduce((s, v) => s + v, 0);
    const diff = app - server;
    ev.push(`서버 로그 합산 = $${server.toFixed(5)} (${m.size}개 항목)`, `차이(앱 − 서버) = $${diff.toFixed(5)} (${((diff / (server || 1)) * 100).toFixed(1)}%)`, `허용: 이중집계 약 $${KNOWN_DOUBLE_COUNT_USD} 감안해 −$0.03 ~ +$${(KNOWN_DOUBLE_COUNT_USD + 0.03).toFixed(3)}`);
    const okRef = diff >= -0.03 && diff <= KNOWN_DOUBLE_COUNT_USD + 0.03;
    // 415차: 앱 generationCost에는 초안 DeepSeek(draftTextCost)가 따로 기록되므로 둘을 합쳐 서버 합산과 비교한다(±3%)
    const draftNum = Number(draftText ?? 0);
    const appFull = app + (Number.isFinite(draftNum) ? draftNum : 0);
    const pctFull = ((appFull - server) / (server || 1)) * 100;
    ev.push(
      `[415차 기준] generationCost + draftTextCost = $${appFull.toFixed(5)} → 서버 대비 ${pctFull.toFixed(1)}% (±3% 이내여야 pass)`,
      `[참고] 기존 허용 범위(−0.03~+${(KNOWN_DOUBLE_COUNT_USD + 0.03).toFixed(3)}) 판정: ${okRef ? "통과" : "벗어남"}`,
    );
    const ok = Math.abs(pctFull) <= 3;
    rows.push({ id: "4", title: "앱 기록(+초안) ↔ 서버 로그 합산 ±3%(415차 기준)", verdict: ok ? "pass" : "fail", evidence: ev });
  }
}

// ---------- 5. 갤러리 착용컷 ----------
{
  const urls = gen.imageUrls ?? sessionRaw.imageUrls ?? [];
  const shown = applyDisplayRules(sections as never, urls, { imageHashByUrl: gen.imageHashByUrl, roles: roles as never, origins: (sessionRaw.imageOrigins ?? gen.imageOrigins) as never, category: "의류/패션" }).sections as unknown as Section[];
  const g = shown.find((s) => s.type === "gallery") as (Section & { imageIndexes?: number[] }) | undefined;
  if (!g?.imageIndexes?.length) rows.push({ id: "5", title: "갤러리에서 착용컷이 앞 칸에 온다(406차)", verdict: "manual", evidence: ["표시되는 갤러리가 없음"] });
  else {
    const worn = g.imageIndexes.map((n) => isWornFashionPhoto("의류/패션", roles[n]));
    const firstNonWorn = worn.indexOf(false);
    const wornAfter = firstNonWorn >= 0 && worn.slice(firstNonWorn).some(Boolean);
    rows.push({
      id: "5",
      title: "갤러리에서 착용컷이 앞 칸에 온다(406차)",
      verdict: wornAfter || worn.every((w) => !w) ? "fail" : "pass",
      evidence: [`갤러리 사진 순서(역할): ${g.imageIndexes.map((n, i) => `${n}:${roles[n] ?? "?"}${worn[i] ? "(착용)" : ""}`).join(" ")}`, wornAfter ? "비착용 사진 뒤에 착용컷이 있음" : worn.every((w) => !w) ? "착용컷이 갤러리에 없음" : "착용컷이 모두 비착용 사진보다 앞"],
    });
  }
}

// ---------- 6. 프롬프트 규칙 ----------
{
  const ev: string[] = [];
  const manual: string[] = [];
  let fail = false;
  // (a) 입력에 없는 수치
  // 단위 표기는 모델이 바꿔 쓰므로("21" → "21 cm") 숫자만 비교한다
  // 415차: 제목·부제·배너(allTexts에 모두 포함)의 "3분"·"두 개" 같은 수치도 잡는다. 단위 확장 + 한글 수사
  // 시간·횟수·개수 단위(분·번·단계…)는 숫자+단위 쌍이 입력에 그대로 있어야 허용("3"이 "3,000원"에 있다고 "3분"이 허용되면 안 된다)
  const STRICT_UNIT = /^(?:시간|분|초|회|번|단계|가지|벌|종|장|주|년|세|사이즈|개)$/;
  const numTok = (t: string) =>
    [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|수|cm|kg|g|mm|일|개|원|시간|시|분|초|회|번|단계|가지|벌|종|장|주|년|세|사이즈)/g)].map((m) => ({ n: m[1]!, unit: m[2]!, full: m[0].replace(/\s+/g, "") }));
  const KO_NUM: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 };
  const koTok = (t: string) =>
    [...t.matchAll(/(두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(개|가지|번|분|단계|장|벌|종|사이즈|시간)/g)].map((m) => ({ tok: m[0], n: KO_NUM[m[1]!]! }));
  // 입력·표에서 센 값은 허용 집합: 숫자 표기는 사이즈 행 수만("3"=단계 수까지 허용하면 "3분"을 놓친다), 한글 수사는 단계·카드·지표 개수까지. "한 장으로" 같은 관용구(한=하나)는 검사하지 않는다
  const counted = new Set<number>();
  const sizeRows =
    (sections.find((x) => x.slot === "size_table") as (Section & { rows?: { label: string }[] }) | undefined)?.rows?.filter((r) => /^(XXS|XS|S|M|L|XL|[2-5]XL|FREE|프리)$/i.test(r.label.trim())).length ?? 0;
  if (sizeRows) counted.add(sizeRows);
  for (const x of sections) {
    const o = x as Record<string, unknown>;
    for (const k of ["steps", "cards", "metrics", "personas", "items", "imageIndexes"]) if (Array.isArray(o[k])) counted.add((o[k] as unknown[]).length);
  }
  const inputNums = new Set([...(inputText + " " + String(sessionRaw.keyFeatures ?? "") + " " + String(sessionRaw.ingredients ?? "")).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]));
  const outNums = new Map<string, string>();
  for (const t of allTexts) {
    for (const k of numTok(t)) {
      const inInput = STRICT_UNIT.test(k.unit) ? inputText.replace(/\s+/g, "").includes(k.full) : inputNums.has(k.n);
      if (!inInput && Number(k.n) !== sizeRows && !outNums.has(k.full)) outNums.set(k.full, t);
    }
    for (const k of koTok(t)) if (!counted.has(k.n) && !inputText.includes(k.tok) && !outNums.has(k.tok)) outNums.set(k.tok, t);
  }
  if (outNums.size > 0) fail = true;
  ev.push(`입력에 없는 수치 토큰: ${outNums.size}개${outNums.size ? " → " + [...outNums.keys()].slice(0, 8).join(", ") : ""}`);
  for (const [n, t] of [...outNums].slice(0, 6)) manual.push(`입력에 없는 수치 "${n}": …${clip(t, 80)}`);
  // (b) 색 표기 일관
  const colorWords = ["화이트", "흰색", "하얀", "백색", "WHITE"].filter((w) => allTexts.some((t) => t.toUpperCase().includes(w.toUpperCase())));
  ev.push(`색 표기 사용: ${colorWords.join(", ") || "(없음)"} (입력 표기는 "화이트")`);
  if (colorWords.length > 1) { fail = true; manual.push(`색 표기가 섞임: ${colorWords.join(" / ")}`); }
  // (c) 근거 없는 일반화
  const GEN = /(모든 사람|누구나|항상|절대|무조건|완벽|최고의|100%\s*만족|평생)/;
  const gens = sentences.filter((s) => GEN.test(s));
  ev.push(`일반화 표현 문장: ${gens.length}개`);
  gens.slice(0, 5).forEach((s) => manual.push(`일반화 의심: ${clip(s, 90)}`));
  // (d) 같은 문장 반복
  const seen = new Map<string, number>();
  for (const s of sentences) seen.set(s, (seen.get(s) ?? 0) + 1);
  const dups = [...seen].filter(([t, n]) => n >= 2 && t !== PLACEHOLDER && /[가-힣]/.test(t));
  ev.push(`같은 문장 반복: ${dups.length}건`);
  dups.slice(0, 5).forEach(([s, n]) => manual.push(`반복 ${n}회: ${clip(s, 90)}`));
  if (dups.length > 0) fail = true;
  rows.push({ id: "6", title: "프롬프트 규칙 효과(f6faa97): 입력 그대로·표기 일관·일반화 없음·반복 없음", verdict: fail ? "fail" : manual.length ? "manual" : "pass", evidence: [...ev, "—— 수동 확인 문장 ——", ...(manual.length ? manual : ["(없음)"])] });
}

// ---------- 출력 ----------
const mark = (v: Verdict) => (v === "pass" ? "✅ pass" : v === "fail" ? "❌ fail" : "🔍 수동 확인");
const md = [
  `# ${LABEL}차 유료 검증 채점 결과 (자동)`,
  ``,
  `- 세션: \`${SESSION}\``,
  `- 요약: \`${SUMMARY}\` ${summary ? "" : "(없음)"}`,
  `- 입력: \`${INPUT}\``,
  `- 서버 로그: ${SERVER_LOG ? `\`${SERVER_LOG}\`` : "(없음)"}`,
  `- 채점 시각: ${new Date().toISOString()}`,
  ``,
  `| # | 항목 | 판정 |`,
  `|---|---|---|`,
  ...rows.map((r) => `| ${r.id} | ${r.title} | ${mark(r.verdict)} |`),
  ``,
  ...rows.flatMap((r) => [`## ${r.id}. ${r.title} — ${mark(r.verdict)}`, ...r.evidence.map((e) => `- ${e}`), ``]),
  `## 7. 새 세션에 3팩을 입힌 캡처`,
  `- \`npx tsx scripts/verify-411-capture.ts --session ${SESSION}\` (dev 서버 :3000 필요, 무료) → \`review/${LABEL}-verify/packs/\``,
  ``,
  `## 사용자가 채울 칸 — 외부 사용량 표`,
  `| 서비스 | 전 | 후 | 차이 |`,
  `|---|---|---|---|`,
  `| Anthropic(USD) | | | |`,
  `| DeepSeek(USD) | | | |`,
  `| Replicate(USD) | | | |`,
  `| 크레딧 | | | |`,
  ``,
].join("\n");
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(OUT, md, "utf8");
console.log(rows.map((r) => `${r.id}\t${r.verdict}\t${r.title}`).join("\n"));
console.log(`→ ${OUT}`);
