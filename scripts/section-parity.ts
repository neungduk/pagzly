/**
 * 454차 3 — 섹션 수 패리티의 정확한 비교. 예전 판정(export 전체 `<section>` 수 vs 계획 ±2)은 안쪽에 중첩된 `<section>`까지 세어 오탐이 났다.
 * export HTML을 태그 단위로 훑어 상세 컨테이너(`.pagzly-wrap`)의 직계 자식만 분류한다(마크업은 바꾸지 않고 DOM 구조만 읽는다).
 *   - 최상위 `<section>`: 계획의 섹션 하나(v4 구분 섹션 `breather.*`도 계획의 breather 섹션이다)
 *   - 컨테이너 밖/안의 중첩 `<section>`: 안쪽 구조(검색용 평문 블록 등)라 따로 센다
 *   - 비섹션 래퍼: 머리글·스타일·구매 띠·요약 띠·구분선·고지 등 (태그 이름별)
 */

export type TopSection = { index: number; attrs: string; kind: string };
export type ExportCounts = {
  /** 상세 컨테이너 직계 `<section>` 목록 */
  top: TopSection[];
  /** 최상위가 아닌 `<section>`(다른 요소 안쪽 중첩) */
  nested: number;
  /** 컨테이너 직계의 비섹션 래퍼를 태그 이름별로 */
  wrappers: Record<string, number>;
};

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style"]);

/** 섹션 종류 지문: 마크업에 이미 있는 표지만 쓴다(id·data-pz-v4·data-pz-impact·class·data-hero-v2) */
export function sectionKind(attrs: string): string {
  const pick = (n: string) => attrs.match(new RegExp(`(?:^|\\s)${n}="([^"]*)"`))?.[1];
  const id = pick("id"), v4 = pick("data-pz-v4"), imp = pick("data-pz-impact"), cls = pick("class"), hero = pick("data-hero-v2");
  return [id && `#${id}`, v4 && `v4:${v4}`, imp && `impact:${imp}`, cls && `.${cls.split(/\s+/)[0]}`, hero !== undefined && `hero:${hero}`].filter(Boolean).join(" ") || "(표지 없음)";
}

export function exportSectionCounts(html: string): ExportCounts {
  const out: ExportCounts = { top: [], nested: 0, wrappers: {} };
  const bodyAt = html.indexOf("<body");
  const src = bodyAt >= 0 ? html.slice(bodyAt) : html;
  const tag = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  const stack: string[] = [];
  let wrapDepth = -1; // 컨테이너가 스택에서 차지하는 깊이(없으면 -1)
  let m: RegExpExecArray | null;
  while ((m = tag.exec(src))) {
    if (m[0].startsWith("<!--")) continue;
    const closing = m[1] === "/", name = m[2]!.toLowerCase(), attrs = (m[3] ?? "").replace(/\/\s*$/, "");
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at >= 0) stack.length = at;
      if (wrapDepth >= 0 && stack.length <= wrapDepth) wrapDepth = -1;
      continue;
    }
    const selfClose = VOID.has(name) || /\/\s*>$/.test(m[0]);
    const isTopChild = wrapDepth >= 0 && stack.length === wrapDepth + 1;
    if (wrapDepth < 0 && name === "div" && /class="[^"]*\bpagzly-wrap\b/.test(attrs)) wrapDepth = stack.length;
    else if (name === "section") {
      if (isTopChild) {
        const kind = sectionKind(attrs);
        out.top.push({ index: out.top.length, attrs: attrs.trim(), kind });
      } else out.nested += 1;
    } else if (isTopChild) out.wrappers[name] = (out.wrappers[name] ?? 0) + 1;
    if (RAW.has(name) && !selfClose) {
      const end = src.indexOf(`</${name}`, tag.lastIndex);
      tag.lastIndex = end >= 0 ? end : src.length;
      continue;
    }
    if (!selfClose) stack.push(name);
  }
  return out;
}

/**
 * 계획 = 라이브이고, export 최상위가 계획과 같거나(차이 0), 계획보다 `splits`만큼 많되 그 차이를 "한 섹션이 둘로 나뉨"으로 따로 설명할 수 있을 때 일치.
 * splits는 단독 렌더로 잰 힌트(section-parity-table.exportSplits)다. 설명되지 않는 차이(없는 섹션이 생기거나 사라짐)는 불일치로 남는다.
 */
export function parityOk(plan: number, live: number, exportTop: number, splits = 0): boolean {
  return plan === live && (exportTop === plan || (splits > 0 && exportTop - plan === splits));
}
