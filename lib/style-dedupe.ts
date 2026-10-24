/**
 * 448차 5 — export HTML 반복 style 묶기(DESIGN_V4). 같은 인라인 style 문자열이 3번 이상 나오면 `data-pz-s="N"` 표식 + 한 번만 쓴 CSS 규칙으로 바꾼다.
 * 보존 장치:
 *  - 선택자 특이도: 규칙을 같은 속성 선택자 6번 겹쳐(0,6,0) 써서, 예전에 인라인이라 이기던 일반 규칙(`.pagzly-wrap … `, 최대 0,4,x대)을 그대로 이긴다. `!important` 규칙은 인라인이든 아니든 우선순위가 같다.
 *  - 문서 CSS가 style 내용으로 고르는 선택자(`[style*="font-size:10px"]` 등 — 글자 하한·모서리·마커 규칙)에 걸리는 문자열은 묶지 않는다(문서에서 읽어 자동 제외).
 *  - `!important`·`&`·`<`·`>`가 든 값, 48자 미만, 3번 미만은 묶지 않는다. script·style 블록 안은 건드리지 않는다.
 * expandDedupedStyles는 역변환(린트·문자열 회귀가 예전 모양으로 읽도록, 그리고 계산 스타일 동일성 검사에 쓴다).
 * export 금지 기법(:has, 컨테이너 쿼리, text-wrap 등) 없음 — 속성 선택자와 일반 선언뿐.
 */
const MIN_LEN = 48;
const MIN_COUNT = 3;
const SPEC = 6;
const MARK = "data-pz-s";
const BLOCK = /(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/g;
const STYLE_ATTR = /\sstyle="([^"]*)"/g;

function styleSelectorSubstrings(html: string): string[] {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n");
  const subs = new Set<string>();
  for (const m of css.matchAll(/\[style[*^$~|]?=\s*("?)([^\]"]+)\1\s*(?:i\s*)?\]/g)) subs.add(m[2]!);
  // 속성 존재만 보는 [style] 선택자가 있으면 한 건도 묶지 않는다
  if (/\[style\]/.test(css)) subs.add("");
  return [...subs];
}

/**
 * ID 선택자(#id)를 쓰는 일반 규칙이 건드리는 속성 이름. ID는 특이도 (1,·,·)라 우리 속성 선택자 규칙(0,6,0)이 못 이기는데, 예전엔 인라인이 이겼다
 * (예: 색상 선택 라벨 `#…:checked ~ … label{color:…}` 가 인라인 color에 졌다). 그런 속성을 선언한 style은 묶지 않는다.
 */
function idRuleProps(html: string): Set<string> {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n");
  const props = new Set<string>();
  for (const r of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/#[A-Za-z_-]/.test(r[1]!)) continue;
    for (const d of r[2]!.split(";")) { const i = d.indexOf(":"); if (i > 0 && !/!important/.test(d)) props.add(d.slice(0, i).trim().toLowerCase()); }
  }
  return props;
}
const propsOf = (style: string): string[] => style.split(";").map((d) => d.slice(0, Math.max(0, d.indexOf(":"))).trim().toLowerCase()).filter(Boolean);

export function dedupeStyles(html: string): string {
  if (html.includes(`<style ${MARK}-rules>`)) return html;
  const parts = html.split(BLOCK);
  const subs = styleSelectorSubstrings(html);
  if (subs.includes("")) return html;
  const counts = new Map<string, number>();
  for (let i = 0; i < parts.length; i += 2) for (const m of parts[i]!.matchAll(STYLE_ATTR)) counts.set(m[1]!, (counts.get(m[1]!) ?? 0) + 1);
  const idProps = idRuleProps(html);
  const picks = [...counts]
    .filter(([s, n]) => n >= MIN_COUNT && s.length >= MIN_LEN && !/[&<>]|!important/.test(s) && !subs.some((x) => s.includes(x)) && !propsOf(s).some((p) => idProps.has(p)))
    .map(([s, n]) => ({ s, n, gain: (n - 1) * (s.length + 9) - (n * (MARK.length + 6) + s.length + 80) }))
    .filter((p) => p.gain > 40)
    .sort((a, b) => b.gain - a.gain);
  if (!picks.length) return html;
  const idx = new Map(picks.map((p, i) => [p.s, i] as const));
  const rules = picks.map((p, i) => `${`[${MARK}="${i}"]`.repeat(SPEC)}{${p.s.replace(/;\s*$/, "")}}`).join("");
  const out = parts.map((seg, i) => (i % 2 === 1 ? seg : seg.replace(STYLE_ATTR, (all, s: string) => (idx.has(s) ? ` ${MARK}="${idx.get(s)}"` : all)))).join("");
  const tag = `<style ${MARK}-rules>${rules}</style>`;
  return out.includes("</head>") ? out.replace("</head>", `${tag}</head>`) : `${tag}${out}`;
}

export function expandDedupedStyles(html: string): string {
  const m = /<style data-pz-s-rules>([\s\S]*?)<\/style>/.exec(html);
  if (!m) return html;
  const decls = new Map<string, string>();
  for (const r of m[1]!.matchAll(/((?:\[data-pz-s="\d+"\])+)\{([^}]*)\}/g)) decls.set(/data-pz-s="(\d+)"/.exec(r[1]!)![1]!, r[2]!);
  const rest = html.replace(m[0], "");
  return rest.split(BLOCK).map((seg, i) => (i % 2 === 1 ? seg : seg.replace(/\sdata-pz-s="(\d+)"/g, (all, k: string) => (decls.has(k) ? ` style="${decls.get(k)}"` : all)))).join("");
}
