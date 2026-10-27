/**
 * 466차 V5 — 제목 정렬 계획. 가운데 정렬 성격(softlife·luxe·pop)이 모든 블록 제목을 가운데로 만들면 중앙 정렬 비율이 기준(UP1 0.33)을 넘고
 * 가운데 정렬이 길게 이어졌다(465차 0.42~0.58, 연속 5). 그래서 성격당 `centerBudget`개 블록만 가운데로(첫 구간의 시선 끄는 블록 1개 + 뒤쪽 1개),
 * 나머지는 왼쪽으로 두고, 본래 가운데인 이웃(갤러리·구매 카드·배너·페르소나 등) 옆에는 놓지 않아 연속을 끊는다.
 * 결과는 임팩트 섹션의 `axAlign`(표시용, 저장 안 함)으로 찍히고 `applyArchetypeHtml`이 읽는다. 라이브·export가 같은 표시 결과를 쓰므로 한 번만 계획한다.
 */
import type { ArchetypeTokens } from "@/lib/page-archetype-v5";
import type { DetailSection } from "@/lib/types/generate";

const SKIP_FAMILY = new Set(["touch", "breather", "statement"]);
const NATURALLY_CENTER_TYPES = new Set(["cta_price", "gallery", "illustration_banner", "target_persona", "color_variation", "review_highlight"]);

const eligible = (s: DetailSection | undefined): boolean => !!s && s.type === "impact" && s.kind === "v4" && !!s.v4 && !SKIP_FAMILY.has(s.v4.family);
const centerish = (s: DetailSection | undefined): boolean => !!s && (NATURALLY_CENTER_TYPES.has(s.type) || (s.type === "image_text" && s.layout === "text_only") || (s.type === "impact" && s.kind === "v4" && !!s.v4 && (s.v4.family === "statement" || (s.v4.family === "story" && s.v4.variant === "quote"))));

export function planAlignV5(sections: DetailSection[], t: ArchetypeTokens): DetailSection[] {
  if (t.titleAlign !== "center") return sections;
  // 짧은 페이지(섹션 16개 미만)에서는 블록 하나가 비율을 크게 흔들어 가운데 블록을 두지 않는다
  if (sections.length < 16) return sections.map((s) => (eligible(s) ? ({ ...s, axAlign: "left" } as DetailSection) : s));
  const elig = sections.map((s, i) => (eligible(s) ? i : -1)).filter((i) => i >= 0);
  if (elig.length === 0) return sections;
  const chosen: number[] = [];
  // 목표 위치: 첫 구간(앞에서 두 번째까지의 적격 블록 중 이웃이 가운데가 아닌 것) → 뒤쪽 70% 근처
  const total = sections.length;
  const targets = [Math.round(total * 0.18), Math.round(total * 0.7)].slice(0, Math.max(0, t.centerBudget));
  for (const target of targets) {
    const pick = elig
      .filter((i) => !centerish(sections[i - 1]) && !centerish(sections[i + 1]) && chosen.every((c) => Math.abs(c - i) >= 3))
      .sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    if (pick !== undefined) chosen.push(pick);
  }
  return sections.map((s, i) => (eligible(s) ? ({ ...s, axAlign: chosen.includes(i) ? "center" : "left" } as DetailSection) : s));
}
