/**
 * 165차 — "Bento 그리드 2.0" 스펙 하이라이트.
 * 크롤링 근거: creazy.app "2026 이커머스 상세페이지 디자인 트렌드" — 정보를 카드
 * 단위로 나누고 리듬감 있게 배치해("Bento 그리드 2.0") 복잡한 데이터의 시각 피로도를
 * 줄이는 것이 2026년 상세페이지 디자인의 핵심 트렌드로 꼽힘. draph.art 트렌드 글에서도
 * "여백을 충분히 두고 정말 중요한 정보만 남기는" 미니멀 카드형 레이아웃을 강조.
 *
 * 55차부터 있던 QuickFactStrip(평문 한 줄 나열, "라벨 : 값 · 라벨 : 값")을 대체하는
 * 히어로 바로 아래 카드형 그리드. 데이터는 완전히 동일(extractQuickFacts가 이미
 * spec_table의 실제 값만 뽑고 플레이스홀더를 걸러냄 — 지어내는 값 없음)하고, 오직
 * 배치·비주얼만 업그레이드. 첫 번째 카드만 deepAccent 배경으로 강조해 "비대칭 색 무게"를
 * 주는 방식으로 실제 CSS grid row-span 없이도 벤토 특유의 리듬감을 안전하게 구현.
 * 라이브 렌더러(SpecBentoGrid.tsx)와 export HTML(이 파일)이 동일 레이아웃을 공유.
 */

import type { QuickFact } from "@/lib/quick-fact-strip";

export type SpecBentoTheme = {
  accent: string;
  baseNeutral: string;
  deepAccent: string;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** BRAND.paper와 동일한 값(design-tokens.ts) — deepAccent 배경 위 밝은 텍스트용 */
const PAPER_TEXT = "#FAF8F3";

/** export HTML용 인라인 스타일 그리드. 최소 2개 이상일 때만 렌더(1개면 그리드 의미 없음). */
export function buildSpecBentoGridHtml(facts: QuickFact[], theme: SpecBentoTheme): string {
  if (facts.length < 2) return "";
  const cells = facts.slice(0, 4);

  const cellsHtml = cells
    .map((f, i) => {
      if (i === 0) {
        return `<div style="background:${theme.deepAccent};border-radius:14px;padding:18px 16px;min-height:84px;display:flex;flex-direction:column;justify-content:flex-end">
          <p style="margin:0 0 6px;font-size:10px;letter-spacing:.14em;opacity:.72;color:${PAPER_TEXT}">${escapeXml(f.label)}</p>
          <p style="margin:0;font-size:19px;font-weight:800;line-height:1.15;color:${PAPER_TEXT}">${escapeXml(f.value)}</p>
        </div>`;
      }
      return `<div style="background:${theme.baseNeutral}66;border:1px solid ${theme.accent}30;border-radius:14px;padding:16px;min-height:84px;display:flex;flex-direction:column;justify-content:flex-end">
        <p style="margin:0 0 5px;font-size:9.5px;letter-spacing:.12em;opacity:.62;color:${theme.deepAccent}">${escapeXml(f.label)}</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:${theme.deepAccent}">${escapeXml(f.value)}</p>
      </div>`;
    })
    .join("");

  return `<div style="max-width:480px;margin:0 auto;padding:18px 20px 2px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${cellsHtml}
  </div>`;
}
