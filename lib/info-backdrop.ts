/**
 * 417차 선행(2-8) — 인포 구간 AI 배경의 슬롯·상한·폴백·프롬프트 규칙. 이 파일은 계산만 한다(네트워크·Replicate 호출 없음).
 * 실제 생성 호출·출력 어댑터·저장은 417차에서 이 파일의 상수·계획 함수를 읽어 연결한다.
 *  - 슬롯: 구간(InfoZone) → 이미지 URL 맵. 맵에 없는 구간은 코드 배경(지금 모습) 그대로, 맵 자체가 없으면 CSS·마크업 바이트 불변.
 *    라이브·export는 같은 infoCss 한 벌에서 이 CSS를 받는다(스크림 위에 글자가 오므로 이미지 밝기와 무관하게 대비를 지킨다).
 *  - 상한: 페이지당 3장·추정 $0.18. 넘는 구간은 폴백(코드 배경). 비용 상수는 416차 실측(−$0.51 vs 추정 $0.33)을 반영해 보수적으로 잡는다.
 *  - 프롬프트: 상품 소재·색·무드·톤을 사전(dictionary)으로만 영어 문구로 바꾼다. 판매자 입력 원문은 프롬프트에 넣지 않는다.
 * 모델 슬러그·단가·프롬프트 문구는 이 파일에만 둔다(다른 곳에 흩뿌리지 않는다).
 */
import type { InfoColors, InfoLevel } from "@/lib/info-style";
import { contrastRatioToken, hexToRgba, mixHex } from "@/lib/design-tokens";

export type InfoZone = "steps" | "points" | "stat" | "compare" | "care";
export type InfoBackdropMap = Partial<Record<InfoZone, string>>;
/** A = 어두운 띠, B = 밝은 띠, C = 액센트 띠 */
export type InfoBackdropKind = "A" | "B" | "C";

// ── 상수 ──
export const INFO_BACKDROP_MAX_COUNT = 3;
/** 페이지당 합계 추정 상한(USD). 올릴 때는 보고서에 적는다 */
export const INFO_BACKDROP_COST_CAP_USD = 0.18;
export const INFO_BACKDROP_TIMEOUT_MS = 40_000;
/** 인포 배경이 기존 생성 대기 시간에 더할 수 있는 최대치(초과분은 폴백) */
export const INFO_BACKDROP_EXTRA_WAIT_MS = 25_000;
export const INFO_BACKDROP_MAX_429_RETRY = 3;
/** retry_after가 없을 때 기다리는 시간 */
export const INFO_BACKDROP_DEFAULT_RETRY_MS = 15_000;

export const INFO_BACKDROP_MODELS: Record<InfoBackdropKind, { slug: `${string}/${string}`; unitUsd: number }> = {
  A: { slug: "ideogram-ai/ideogram-v3-turbo", unitUsd: 0.04 },
  B: { slug: "black-forest-labs/flux-1.1-pro", unitUsd: 0.05 },
  C: { slug: "ideogram-ai/ideogram-v3-turbo", unitUsd: 0.04 },
};

/** 구간 → 띠 종류. 어두운 띠(포인트·단계)=A, 밝은 띠(혼방·비교)=B, 액센트 띠=C */
export const INFO_ZONE_KIND: Record<InfoZone, InfoBackdropKind> = { points: "A", steps: "A", stat: "B", compare: "B", care: "C" };
/** 대비가 큰 순(앞일수록 먼저 뽑는다) */
export const INFO_ZONE_PRIORITY: readonly InfoZone[] = ["points", "steps", "stat", "compare", "care"];

// ── 적용 조건 ──
export function infoBackdropEligible(input: { category: string; info: InfoLevel | undefined; autoEnabled: boolean; hasSpec: boolean }): boolean {
  return input.category === "의류/패션" && input.hasSpec && input.autoEnabled && (input.info === "bold" || input.info === "dramatic");
}

// ── 장수·비용 상한 계획 ──
export type InfoBackdropPlanItem = { zone: InfoZone; kind: InfoBackdropKind; slug: string; unitUsd: number };
export type InfoBackdropFallback = { zone: InfoZone; reason: "count" | "cost" };
export type InfoBackdropPlan = { items: InfoBackdropPlanItem[]; fallbacks: InfoBackdropFallback[]; estimateUsd: number };

/** present = 이 페이지에 실제로 있는 인포 구간. 우선순위대로 뽑고 장수·비용 상한을 넘으면 코드 배경으로 폴백 */
export function planInfoBackdrops(present: readonly InfoZone[]): InfoBackdropPlan {
  const have = new Set(present);
  const items: InfoBackdropPlanItem[] = [];
  const fallbacks: InfoBackdropFallback[] = [];
  let spend = 0;
  for (const zone of INFO_ZONE_PRIORITY) {
    if (!have.has(zone)) continue;
    const kind = INFO_ZONE_KIND[zone];
    const m = INFO_BACKDROP_MODELS[kind];
    if (items.length >= INFO_BACKDROP_MAX_COUNT) { fallbacks.push({ zone, reason: "count" }); continue; }
    if (spend + m.unitUsd > INFO_BACKDROP_COST_CAP_USD + 1e-9) { fallbacks.push({ zone, reason: "cost" }); continue; }
    items.push({ zone, kind, slug: m.slug, unitUsd: m.unitUsd });
    spend += m.unitUsd;
  }
  return { items, fallbacks, estimateUsd: +spend.toFixed(4) };
}

// ── 비용 기록 ──
/**
 * 호출 결과 한 건. billed = 과금됐을 수 있는 호출(성공, 또는 생성은 됐으나 출력 형식을 못 읽어 폴백한 경우 — 416차 flux-schnell).
 * 429·타임아웃 전 거절처럼 과금 안 된 호출만 billed=false.
 */
export type InfoBackdropOutcome = { zone: InfoZone; kind: InfoBackdropKind; billed: boolean; ok: boolean };
/** photoCostBreakdown.infoBackdrops에 들어갈 값 — 보수적 단가 × 과금 가능 호출 수 */
export function infoBackdropCostUsd(outcomes: readonly InfoBackdropOutcome[]): number {
  return +outcomes.reduce((s, o) => s + (o.billed ? INFO_BACKDROP_MODELS[o.kind].unitUsd : 0), 0).toFixed(4);
}
/** 슬롯에 넣을 맵 — 성공한 구간만. 나머지는 코드 배경 */
export function infoBackdropMapFrom(results: ReadonlyArray<{ zone: InfoZone; ok: boolean; url?: string | null }>): InfoBackdropMap {
  const map: InfoBackdropMap = {};
  for (const r of results) {
    const u = r.ok ? safeBackdropUrl(r.url) : null;
    if (u) map[r.zone] = u;
  }
  return map;
}

// ── 프롬프트 ──
const NEGATIVE_SUFFIX = "no text, no letters, no logos, no watermark, no people, background plate for text overlay, calm center area";

/** 소재 사전 — 순서대로 첫 일치. 니트가 아니면 니트 단어를 쓰지 않는다 */
const MATERIAL_TEXTURES: Array<[RegExp, string]> = [
  [/니트|울|캐시미어|앙고라|모헤어|알파카|knit|wool|cashmere/i, "soft cream cable-knit wool texture"],
  [/데님|청|denim|jean/i, "washed indigo denim twill texture"],
  [/린넨|리넨|마|linen/i, "natural linen weave texture"],
  [/실크|새틴|쉬폰|silk|satin|chiffon/i, "smooth satin fabric sheen"],
  [/가죽|레더|스웨이드|leather|suede/i, "fine grain leather texture"],
  [/저지|면|코튼|티셔츠|맨투맨|후드|cotton|jersey|fleece|기모/i, "soft cotton jersey fabric texture"],
  [/트위드|코듀로이|골덴|tweed|corduroy/i, "tactile tweed fabric texture"],
];
const GENERIC_TEXTURE = "soft woven textile texture";

const COLOR_WORDS: Array<[RegExp, string]> = [
  [/베이지|아이보리|크림|오트밀|beige|ivory|cream/i, "warm beige"],
  [/브라운|카멜|갈색|모카|camel|brown/i, "camel brown"],
  [/블랙|검정|차콜|black|charcoal/i, "charcoal"],
  [/네이비|남색|navy/i, "deep navy"],
  [/그레이|회색|gr[ae]y/i, "soft grey"],
  [/화이트|흰색|white/i, "soft white"],
  [/그린|카키|올리브|green|khaki|olive/i, "muted olive green"],
  [/레드|버건디|와인|red|burgundy|wine/i, "muted burgundy"],
  [/핑크|로즈|pink|rose/i, "dusty rose"],
  [/블루|하늘|blue/i, "dusty blue"],
];
const MOOD_WORDS: Array<[RegExp, string]> = [
  [/따뜻|포근|cozy|warm/i, "warm"],
  [/차분|담백|미니멀|minimal|calm/i, "quiet minimal"],
  [/우아|고급|elegant|luxury/i, "elegant"],
  [/캐주얼|편안|casual/i, "relaxed"],
  [/시크|모던|chic|modern/i, "modern"],
];

const firstHit = (table: Array<[RegExp, string]>, text: string | null | undefined): string | null => {
  if (!text) return null;
  for (const [re, out] of table) if (re.test(text)) return out;
  return null;
};

export type InfoBackdropPromptInput = { material?: string | null; color?: string | null; mood?: string | null };

/** 사전에 있는 값만 영어로 바꿔 넣는다 — 입력 원문(상품명·브랜드·인물 등)은 프롬프트에 들어가지 않는다 */
export function buildInfoBackdropPrompt(kind: InfoBackdropKind, input: InfoBackdropPromptInput): string {
  const texture = firstHit(MATERIAL_TEXTURES, input.material) ?? GENERIC_TEXTURE;
  const color = firstHit(COLOR_WORDS, input.color);
  const mood = firstHit(MOOD_WORDS, input.mood);
  const tint = color ? `, ${color} tones` : "";
  const feel = mood ? `${mood} ` : "";
  if (kind === "A") {
    return `macro ${texture} in deep shadow, dramatic side light, moody warm tones${tint}, shallow depth of field, premium ${feel}fashion editorial, ${NEGATIVE_SUFFIX}`;
  }
  if (kind === "B") {
    return `soft ivory paper and linen texture, warm window light streak, gentle shadow gradient${tint}, quiet ${feel}luxury editorial backdrop, ${NEGATIVE_SUFFIX}`;
  }
  return `abstract draped fabric folds in muted ${color ?? "camel and rust"} tones, smooth gradient light, cinematic, ${feel}elegant, minimal, ${NEGATIVE_SUFFIX}`;
}

/** 같은 상품 = 같은 시드(FNV-1a 32비트). 종류별로 다르게 */
export function infoBackdropSeed(productKey: string, kind: InfoBackdropKind): number {
  let h = 0x811c9dc5;
  for (const ch of `${productKey}|${kind}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 2_147_483_647;
}

// ── 슬롯 CSS ──
const SLOT_ZONES: InfoZone[] = ["steps", "points", "stat", "compare", "care"];
/** https 주소만, CSS·HTML을 깰 문자 없음 */
export function safeBackdropUrl(u: string | null | undefined): string | null {
  if (!u || u.length > 2000) return null;
  return /^https:\/\/[^\s"'()<>\\]+$/.test(u) ? u : null;
}

/** 이미지가 최악(스크림 반대편 극단색)이어도 글자 대비가 target 이상이 되는 최소 스크림 투명도 */
export function scrimAlpha(scrimHex: string, textHex: string, worstImageHex: string, target: number): number {
  for (let a = 0.5; a <= 0.96; a += 0.01) {
    if (contrastRatioToken(textHex, mixHex(worstImageHex, scrimHex, a)) >= target) return +a.toFixed(2);
  }
  return 0.96;
}

/**
 * 슬롯 CSS — 맵에 URL이 있는 구간에만 이미지 + 스크림 한 장을 깐다. 스크림은 구간의 기존 배경색(어두운 띠는 진한 색, 나머지는 연한 색).
 * 맵이 비었거나 calm이면 빈 문자열. 라이브·export 양쪽 infoCss가 같은 결과를 붙인다.
 */
export function infoBackdropCss(map: InfoBackdropMap | undefined, level: InfoLevel | undefined, scope: string, c: InfoColors): string {
  if (!map || !level || level === "calm") return "";
  const dr = level === "dramatic";
  const out: string[] = [];
  for (const zone of SLOT_ZONES) {
    const url = safeBackdropUrl(map[zone]);
    if (!url) continue;
    const dark = zone === "points" || (zone === "stat" && dr);
    const scrimHex = dark ? c.deep : zone === "compare" ? c.paper : c.soft;
    const a = dark ? scrimAlpha(scrimHex, c.paper, "#FFFFFF", 5) : scrimAlpha(scrimHex, c.ink, "#000000", 5.5);
    const scrim = hexToRgba(scrimHex, a);
    out.push(`${scope} [data-info="${zone}"]{background:linear-gradient(${scrim},${scrim}),url("${url}") center/cover no-repeat !important}`);
  }
  return out.join("");
}

// ── 417차: 모델 입력·출력 어댑터·호출 실행기(의존성 주입 — 단위 테스트는 모킹, 서버 라우트가 실제 Replicate를 꽂는다) ──
/** 416차 실측으로 확인한 입력 이름만 쓴다(ideogram: seed·aspect_ratio·magic_prompt_option / flux-1.1-pro: seed·aspect_ratio·output_format·safety_tolerance·prompt_upsampling) */
export function infoBackdropInput(kind: InfoBackdropKind, prompt: string, seed: number): Record<string, unknown> {
  if (kind === "B") return { prompt, aspect_ratio: "3:4", seed, output_format: "png", safety_tolerance: 2, prompt_upsampling: false };
  return { prompt, aspect_ratio: "3:4", seed, magic_prompt_option: "Off" };
}

/** 배경판 비율(너비/높이) 허용 범위 — 3:4 요청, 벗어나면 이상 비율로 보고 폴백 */
export const INFO_BACKDROP_RATIO_RANGE = [0.6, 0.9] as const;

export type FetchBuffer = (url: string) => Promise<Buffer | null>;
/**
 * Replicate 출력은 모델마다 다르다: 문자열 URL / 문자열 배열 / FileOutput(url()·blob()) / 바이트.
 * 한 곳에서 모두 처리하고 알 수 없는 형식이면 null(호출부가 저장 없이 폴백한다). format은 로그용 라벨.
 */
export async function infoBackdropOutputToBuffer(out: unknown, fetchBuffer: FetchBuffer): Promise<{ buffer: Buffer | null; format: string }> {
  if (Array.isArray(out)) {
    if (out.length === 0) return { buffer: null, format: "array(empty)" };
    const r = await infoBackdropOutputToBuffer(out[0], fetchBuffer);
    return { buffer: r.buffer, format: `array>${r.format}` };
  }
  if (typeof out === "string") {
    if (!/^(https:\/\/|data:image\/)/.test(out)) return { buffer: null, format: "string(unsupported)" };
    return { buffer: await fetchBuffer(out), format: "string" };
  }
  if (out instanceof Uint8Array) return { buffer: Buffer.from(out), format: "bytes" };
  if (out && typeof out === "object") {
    const o = out as { url?: unknown; blob?: unknown };
    if (typeof o.blob === "function") {
      const blob = (await (o.blob as () => Promise<Blob>)()) as Blob;
      return { buffer: Buffer.from(await blob.arrayBuffer()), format: "FileOutput(blob)" };
    }
    if (typeof o.url === "function") {
      const u = (o.url as () => unknown)();
      const href = u instanceof URL ? u.href : typeof u === "string" ? u : null;
      return href ? { buffer: await fetchBuffer(href), format: "FileOutput(url)" } : { buffer: null, format: "FileOutput(url:bad)" };
    }
    if (typeof o.url === "string") return { buffer: await fetchBuffer(o.url), format: "object(url)" };
  }
  return { buffer: null, format: `unknown(${out === null ? "null" : typeof out})` };
}

export const isRateLimited = (e: unknown): boolean =>
  (e as { response?: { status?: number } })?.response?.status === 429 || /\b429\b|too many requests|throttl/i.test(String((e as Error)?.message ?? e));
export const isFatalAuth = (e: unknown): boolean => {
  const status = (e as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 402 || status === 403 || /\b(401|402|403)\b|unauthor|insufficient|payment required|billing/i.test(String((e as Error)?.message ?? e));
};
/** 429 응답의 retry_after(초)를 ms로. 없으면 기본 15초 */
export function retryAfterMsOf(e: unknown): number {
  const header = (e as { response?: { headers?: { get?: (k: string) => string | null } } })?.response?.headers?.get?.("retry-after");
  const m = String((e as Error)?.message ?? e).match(/retry_after"?\s*[:=]\s*(\d+(?:\.\d+)?)/i);
  const sec = m ? Number(m[1]) : header && Number.isFinite(Number(header)) ? Number(header) : INFO_BACKDROP_DEFAULT_RETRY_MS / 1000;
  return Math.ceil(sec * 1000) + 500;
}

export type InfoBackdropDeps = {
  run: (slug: string, input: Record<string, unknown>) => Promise<unknown>;
  fetchBuffer: FetchBuffer;
  /** 이미지 검증(비율 등). false면 이상 이미지로 보고 폴백 — 호출은 이미 과금됐다 */
  validate?: (buffer: Buffer) => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  timeoutMs?: number;
  log?: (line: string) => void;
};
export type InfoBackdropJobResult = {
  zone: InfoZone;
  kind: InfoBackdropKind;
  ok: boolean;
  billed: boolean;
  seconds: number;
  retries: number;
  format?: string;
  buffer?: Buffer;
  /** 폴백 사유(로그용) */
  reason?: "rate-limit" | "timeout" | "unknown-format" | "bad-image" | "error" | "auth";
  fatal?: boolean;
};

/** 한 구간 호출. 429면 retry_after만큼 기다려 최대 3회 재전송(과금 없음), 40초 타임아웃, 그 외 오류는 재시도 없이 폴백. 401/402/403은 fatal */
export async function runInfoBackdropJob(item: InfoBackdropPlanItem, prompt: string, seed: number, deps: InfoBackdropDeps): Promise<InfoBackdropJobResult> {
  const t0 = deps.now();
  const limit = deps.timeoutMs ?? INFO_BACKDROP_TIMEOUT_MS;
  const base = { zone: item.zone, kind: item.kind };
  let retries = 0;
  const elapsed = () => (deps.now() - t0) / 1000;
  const log = (s: string) => deps.log?.(`[info-backdrops] zone=${item.zone} model=${item.slug.split("/")[1]} ${s}`);
  const timeoutP = deps.sleep(limit).then(() => "timeout" as const);
  const work = (async (): Promise<InfoBackdropJobResult> => {
    for (;;) {
      let out: unknown;
      try {
        out = await deps.run(item.slug, infoBackdropInput(item.kind, prompt, seed));
      } catch (e) {
        if (isRateLimited(e)) {
          if (retries >= INFO_BACKDROP_MAX_429_RETRY) return { ...base, ok: false, billed: false, seconds: elapsed(), retries, reason: "rate-limit" };
          const wait = retryAfterMsOf(e);
          retries += 1;
          log(`429 — ${(wait / 1000).toFixed(1)}초 후 재전송 ${retries}/${INFO_BACKDROP_MAX_429_RETRY}(과금 없음)`);
          await deps.sleep(wait);
          continue;
        }
        if (isFatalAuth(e)) return { ...base, ok: false, billed: false, seconds: elapsed(), retries, reason: "auth", fatal: true };
        return { ...base, ok: false, billed: false, seconds: elapsed(), retries, reason: "error" };
      }
      const { buffer, format } = await infoBackdropOutputToBuffer(out, deps.fetchBuffer);
      if (!buffer) return { ...base, ok: false, billed: true, seconds: elapsed(), retries, format, reason: "unknown-format" };
      if (deps.validate && !(await deps.validate(buffer))) return { ...base, ok: false, billed: true, seconds: elapsed(), retries, format, reason: "bad-image" };
      return { ...base, ok: true, billed: true, seconds: elapsed(), retries, format, buffer };
    }
  })();
  const winner = await Promise.race([work, timeoutP]);
  const res: InfoBackdropJobResult = winner === "timeout" ? { ...base, ok: false, billed: true, seconds: elapsed(), retries, reason: "timeout" } : winner;
  // 타임아웃 뒤 늦게 끝난 work의 거절을 삼킨다
  void work.catch(() => undefined);
  log(`${res.ok ? "OK" : `폴백(${res.reason})`} ${res.seconds.toFixed(1)}s retries=${res.retries} billed=${res.billed}${res.format ? ` format=${res.format}` : ""}`);
  return res;
}

/** 계획의 모든 구간을 병렬로 호출 */
export async function runInfoBackdropPlan(
  plan: InfoBackdropPlan,
  prompts: InfoBackdropPromptInput,
  productKey: string,
  deps: InfoBackdropDeps,
): Promise<InfoBackdropJobResult[]> {
  return Promise.all(plan.items.map((it) => runInfoBackdropJob(it, buildInfoBackdropPrompt(it.kind, prompts), infoBackdropSeed(productKey, it.kind), deps)));
}
