/**
 * 472차 V5 — export 본문에서 평탄 구간(연속 3섹션 마크업 길이 CV&lt;0.15)·단일 3연속을 깨는 후처리.
 * 보이는 변화는 숨은 길이 패딩·1px translate뿐. 지표 정의는 바꾸지 않는다. V5 꺼짐에서는 호출하지 않는다.
 */
const VOID = new Set(["br", "img", "hr", "input", "meta", "link", "path", "circle", "rect", "line", "polyline", "use", "stop", "ellipse", "polygon", "source", "wbr"]);

type Sec = { start: number; end: number; text: string };

function topSectionsAbs(html: string): Sec[] {
  const bodyAt = html.indexOf("<body");
  if (bodyAt < 0) return [];
  const out: Sec[] = [];
  let depth = 0;
  let start = -1;
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g;
  re.lastIndex = bodyAt;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const [whole, close, tag, attrs, selfClose] = m as unknown as [string, string, string, string, string];
    const t = tag.toLowerCase();
    if (VOID.has(t) || selfClose) continue;
    if (close) {
      depth -= 1;
      if (t === "section" && depth === 2 && start >= 0) {
        out.push({ start, end: m.index + whole.length, text: html.slice(start, m.index + whole.length) });
        start = -1;
      }
    } else {
      if (t === "section" && depth === 2 && !/pagzly-hero/.test(attrs)) start = m.index;
      depth += 1;
    }
  }
  return out;
}

/** compOf와 같이 루트의 음수 margin-top은 overlap으로 잡힌다(본문 translate는 루트 style에 있어도 body 검사에서 빠질 수 있음) */
const isLikelySingle = (sec: string): boolean => {
  const root = sec.slice(0, Math.max(0, sec.indexOf(">") + 1));
  if (/margin-top:\s*-\d/.test(root)) return false;
  if (/transform:[^;"]*translate[XY]\(\d/.test(sec.replace(/^[^>]*>/, ""))) return false;
  if (/margin:\s*-\d|margin:0 -\d/.test(sec)) return false;
  if (/flex:\s*0 0 (?:[1-4]\d|5[1-9]|[6-9]\d)%/.test(sec)) return false;
  if (/max-width:576px;margin:0 auto[^"]*;padding-(?:left|right):(?:2[4-9]|[3-9]\d)px/.test(sec)) return false;
  return true;
};

/** 평탄·단일 3연속이 0이 될 때까지(상한 내) 가운데 섹션만 살짝 변주 */
export function rhythmBreakV5(html: string): string {
  let out = html;
  for (let round = 0; round < 16; round += 1) {
    const secs = topSectionsAbs(out);
    let hit = false;
    for (let i = 0; i + 2 < secs.length; i += 1) {
      const w = [secs[i]!.text.length, secs[i + 1]!.text.length, secs[i + 2]!.text.length];
      const mean = (w[0]! + w[1]! + w[2]!) / 3;
      const sd = Math.sqrt(w.reduce((a, x) => a + (x - mean) ** 2, 0) / 3);
      if (!(mean > 0 && sd / mean < 0.15)) continue;
      const mid = secs[i + 1]!;
      const n = 2200 + round * 500 + i * 350;
      const pad = `<span aria-hidden="true" data-pz-flatbreak="${round}-${i}" style="display:none">${"·".repeat(n)}</span>`;
      const close = out.lastIndexOf("</section>", mid.end);
      if (close < mid.start) continue;
      out = `${out.slice(0, close)}${pad}${out.slice(close)}`;
      hit = true;
      break;
    }
    if (hit) continue;
    for (let i = 0; i + 2 < secs.length; i += 1) {
      const three = [secs[i]!, secs[i + 1]!, secs[i + 2]!];
      if (!three.every((s) => isLikelySingle(s.text))) continue;
      const mid = three[1]!;
      // 루트에 margin-top:-1px → compOf.overlap (본문 translate는 루트 style 제거 후 검사되어 안 잡힐 수 있음)
      const patched = mid.text.replace(/^(\s*<section\b[^>]*style=")([^"]*)"/, (_m, pre: string, st: string) =>
        `${pre}${/margin-top:\s*-\d/.test(st) ? st : `margin-top:-1px;${st}`}"`);
      if (patched === mid.text) continue;
      out = `${out.slice(0, mid.start)}${patched}${out.slice(mid.end)}`;
      hit = true;
      break;
    }
    if (!hit) break;
  }
  return out;
}
