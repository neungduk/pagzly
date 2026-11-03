/**
 * 482 C — 사진 중심 블록 시각 요소 단순화.
 * 우선순위: 장식 → 밑줄/마커 → 알약 → 영문 라벨. 목표 합 ≤2(최대 3).
 * 제목 1개 유지, 제목 크기 ≥ 본문×2.2 보정.
 */
import { designV5On } from "@/lib/design-v4";

export const BLOCK_SIMPLE_MAX = 3;
export const BLOCK_SIMPLE_TARGET = 2;
export const TITLE_TO_BODY_MIN = 2.2;

const PHOTO_BLOCK_RE = /data-pz-v4="(?:phototext|benefits)[^"]*"|data-pz-pb=|data-pz-pc="bleed"|data-pz-sf="b|data-info="points"/i;

export function isPhotoCentricBlockHtml482(html: string): boolean {
  return PHOTO_BLOCK_RE.test(html);
}

/** 시각 장식·라벨·알약·밑줄 개수(제목·본문·사진 제외) */
export function countBlockChrome482(html: string): number {
  let n = 0;
  if (/data-pz-ax-decor|data-pz-bmark|data-pz-deco|data-pz-dyn|data-pz-ghost|data-pz-motif/i.test(html)) n += 1;
  if (/data-pz-kw|squiggleUnderline|highlighter|transparent 60%/i.test(html)) n += 1;
  if (/data-pz-chip|PointPill|formatPointBadge|border-radius:\s*999px[^>]{0,80}POINT/i.test(html)) n += 1;
  if (/data-pz-bchrome|data-pz-eyebrow|EYEBROW|letter-spacing:\s*\.2em/i.test(html)) n += 1;
  // 중복 제목
  const titles = html.match(/data-pz-title/g);
  if (titles && titles.length > 1) n += titles.length - 1;
  return n;
}

function stripFirst(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    if (re.test(html)) return html.replace(re, "");
  }
  return html;
}

/**
 * 제거 우선순위 적용. max 이하가 될 때까지.
 * V5 off면 원문 반환.
 */
export function simplifyBlockHtml482(html: string, max = BLOCK_SIMPLE_MAX): string {
  if (!designV5On() || !isPhotoCentricBlockHtml482(html)) return html;
  let out = html;
  const steps: RegExp[][] = [
    // 1 장식
    [
      /<[^>]*data-pz-ax-decor[^>]*>[\s\S]*?<\/[^>]+>/i,
      /<[^>]*data-pz-bmark[^>]*>[\s\S]*?<\/[^>]+>/i,
      /<[^>]*data-pz-deco[^>]*>[\s\S]*?<\/[^>]+>/i,
      /<[^>]*data-pz-dyn[^>]*>[\s\S]*?<\/[^>]+>/i,
      /<[^>]*data-pz-ghost[^>]*>[\s\S]*?<\/[^>]+>/i,
    ],
    // 2 밑줄/마커 → 색 강조만 남기거나 제거
    [/data-pz-kw[^>]*style="([^"]*)"/gi],
    // 3 알약
    [/<[^>]*data-pz-chip[^>]*>[\s\S]*?<\/[^>]+>/gi],
    // 4 영문 라벨 행
    [/<[^>]*data-pz-bchrome[^>]*>[\s\S]*?<\/div>/gi, /<[^>]*data-pz-eyebrow[^>]*>[\s\S]*?<\/[^>]+>/gi],
  ];

  let guard = 0;
  while (countBlockChrome482(out) > max && guard++ < 12) {
    const before = out;
    if (countBlockChrome482(out) > max) {
      // 밑줄: gradient를 글자 아래 간격형으로 교체
      out = out.replace(
        /background-image:linear-gradient\(transparent 60%,([^)]+)\)/gi,
        "background-image:linear-gradient(transparent 88%,$1);background-position:0 100%;background-size:100% 0.22em;background-repeat:no-repeat;padding-bottom:0.18em",
      );
    }
    if (countBlockChrome482(out) > max) {
      for (const group of steps) {
        const next = stripFirst(out, group);
        if (next !== out) {
          out = next;
          break;
        }
      }
    }
    // 중복 data-pz-title: 두 번째부터 제거
    if (countBlockChrome482(out) > max) {
      let seen = 0;
      out = out.replace(/<([^>]*data-pz-title[^>]*)>([\s\S]*?)<\/\w+>/gi, (full) => {
        seen += 1;
        return seen === 1 ? full : "";
      });
    }
    if (out === before) break;
  }

  // 제목 크기 ≥ 본문×2.2 — phototext 22px 보정
  out = out.replace(/font-size:22px/g, `font-size:${Math.ceil(15 * TITLE_TO_BODY_MIN)}px`);
  return out;
}

/** 제목/본문 px 비율 검사(마크업 근사) */
export function titleBodyRatioOk482(html: string, min = TITLE_TO_BODY_MIN): boolean {
  const titleM = html.match(/data-pz-title[^>]*font-size:(\d+)px|font-size:(\d+)px[^>]*data-pz-title/i);
  const bodyM = html.match(/data-pz-body[^>]*font-size:(\d+(?:\.\d+)?)px|font-size:(\d+(?:\.\d+)?)px[^>]{0,40}data-pz-body/i);
  const t = Number(titleM?.[1] || titleM?.[2] || 0);
  const b = Number(bodyM?.[1] || bodyM?.[2] || 15);
  if (!t) return true; // 측정 불가면 통과
  return t / b >= min - 0.05;
}
