/**
 * 433차 1-1 — 스토리 순서 엔진. 섹션을 스토리 단계로 분류하고 단계 순서(훅 → 공감 → 해결 → 근거 → 사용 → 정보 → 신뢰·정책 → 구매)로 안정 정렬한다.
 *  - 표시 단계에서만 재정렬한다(저장 세션 JSON은 그대로). 섹션 추가·삭제·문구 변경 없음. 입력에 없는 단계는 자연히 건너뛴다(그 단계 섹션이 없으니).
 *  - 단계를 모르는 섹션(장식 배너·중간 갤러리·장면 이미지 등)은 바로 앞 섹션 묶음에 붙어 같이 움직인다.
 *  - 히어로 바로 뒤(훅 구역)에 질문형 체크리스트("Q. …남아 있나요?")를 두지 않는다 — 공감(고민) 이후, 해결 첫 섹션 뒤로 보낸다.
 *  - 정보·신뢰 단계의 세부 순서는 section-flow-order(TAIL_RANK)가 이어서 정리하므로 여기서는 같은 단계로만 묶는다.
 * 호출 위치: applyDisplayRules의 게이트·정책 뒤, section-flow-order 앞. 편집 모드·claimFacts 없음에서는 부르지 않는다.
 */
import type { DetailSection } from "@/lib/types/generate";

/** 기본 켬. 끄려면 NEXT_PUBLIC_COMPOSITION_V2=off 로 서버를 시작한다(432차와 같은 화면 — 전/후 캡처·되돌리기용) */
export const COMPOSITION_V2_ENABLED = process.env.NEXT_PUBLIC_COMPOSITION_V2 !== "off";

/** 스토리 순서·리듬 분산은 뷰티·패션에서 먼저 적용한다(전자·생활·식품은 임팩트 화면 템플릿 공통 부분만) */
export const STORY_CATEGORIES = ["화장품/뷰티", "의류/패션"] as const;
export const storyOrderOn = (category: string | undefined | null, enabled: boolean = COMPOSITION_V2_ENABLED): boolean =>
  enabled && !!category && (STORY_CATEGORIES as readonly string[]).includes(category);

export type StoryStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const STORY_STAGE_NAMES: Record<StoryStage, string> = {
  1: "훅",
  2: "공감",
  3: "해결·핵심 가치",
  4: "근거",
  5: "사용·활용",
  6: "정보",
  7: "신뢰·정책",
  8: "구매",
};

const BY_SLOT_OR_TYPE: Record<string, StoryStage> = {
  hero: 1,
  target_persona: 2,
  checklist: 2,
  brand_story: 3,
  quick_points: 3,
  feature_callout: 3,
  highlight_box: 3,
  feature_detail: 3,
  design_detail: 3,
  ingredient_highlight: 4,
  texture_feel: 4,
  detail_zoom: 4,
  stat_infographic: 4,
  comparison_chart: 4,
  comparison_table: 4,
  review_highlight: 4,
  certificate_evidence: 4,
  before_after: 4,
  how_it_works: 4,
  usage_steps: 5,
  step_card: 5,
  coordination: 5,
  seasonal_styling: 5,
  customer_scenario: 5,
  usage_scenario: 5,
  install_scenario: 5,
  color_variation: 5,
  connectivity: 5,
  tradeoff_card: 6,
  package_contents: 6,
  packaging_design: 6,
  fit_guide: 6,
  size_options: 6,
  spec_table: 6,
  size_table: 6,
  fabric_composition: 6,
  care_info: 7,
  caution: 7,
  faq: 7,
  shipping_info: 7,
  ai_disclosure: 7,
  cta_price: 8,
};

const slotOf = (s: DetailSection): string => (typeof (s as { slot?: unknown }).slot === "string" ? ((s as { slot: string }).slot) : "");

/** 질문형 체크리스트: "Q. …", 물음표로 끝나는 제목 */
export function isQuestionChecklist(s: DetailSection): boolean {
  if (s.type !== "checklist") return false;
  const h = (s.heading ?? "").trim();
  return /^Q[.\s:]/i.test(h) || /[?？]$/.test(h) || /남아\s*있나요|있으신가요|없으신가요/.test(h);
}

/** 단계를 모르면 null(바로 앞 묶음에 붙는다) */
export function storyStageOf(s: DetailSection): StoryStage | null {
  const slot = slotOf(s);
  if (slot && slot in BY_SLOT_OR_TYPE) return BY_SLOT_OR_TYPE[slot]!;
  if (s.type in BY_SLOT_OR_TYPE) return BY_SLOT_OR_TYPE[s.type]!;
  return null;
}

export type StoryOrderResult = { sections: DetailSection[]; moves: number };

/**
 * 안정 정렬. 히어로가 맨 앞이 아니거나 단계를 아는 섹션이 2개 미만이면 그대로 둔다.
 * 반환 배열의 섹션 객체는 입력과 같은 참조다(호출부가 indexOf로 원래 번호를 되돌린다).
 */
export function applyStoryOrder(sections: DetailSection[]): StoryOrderResult {
  if (sections.length < 3 || sections[0]!.type !== "hero") return { sections, moves: 0 };
  // 묶음: 단계를 아는 섹션이 리더, 모르는 섹션은 앞 리더에 붙는다. 히어로 뒤 첫 구간의 갤러리는 훅에 붙는다.
  type Group = { rank: number; members: DetailSection[]; at: number; question: boolean };
  const groups: Group[] = [];
  for (const [i, s] of sections.entries()) {
    const stage = storyStageOf(s);
    if (stage == null) {
      const last = groups[groups.length - 1];
      if (last) last.members.push(s);
      else groups.push({ rank: 1, members: [s], at: i, question: false });
      continue;
    }
    const q = isQuestionChecklist(s);
    // 질문형 체크리스트는 공감과 해결 사이(2.5)에 둔다. 아래에서 훅 바로 뒤에 오면 해결 첫 섹션 뒤로 한 번 더 민다.
    groups.push({ rank: q ? 2.5 : stage, members: [s], at: i, question: q });
  }
  // 히어로 직후의 갤러리(첫 갤러리)는 훅 구역
  if (groups[1] && groups[1].members[0]!.type === "gallery" && storyStageOf(groups[1].members[0]!) == null) groups[1]!.rank = 1;
  const sorted = [...groups].sort((a, b) => a.rank - b.rank || a.at - b.at);
  // 훅 구역(rank 1) 바로 뒤에 질문형 체크리스트가 오면 해결 단계의 첫 묶음 뒤로 민다
  const firstAfterHook = sorted.findIndex((g) => g.rank > 1);
  const qi = sorted.findIndex((g, i) => i === firstAfterHook && g.question);
  if (qi >= 0) {
    const [q] = sorted.splice(qi, 1);
    const firstSolution = sorted.findIndex((g, i) => i >= qi && g.rank >= 3);
    sorted.splice(firstSolution < 0 ? qi : firstSolution + 1, 0, q!);
  }
  const out = sorted.flatMap((g) => g.members);
  const moves = out.reduce((n, s, i) => (s !== sections[i] ? n + 1 : n), 0);
  return moves === 0 ? { sections, moves: 0 } : { sections: out, moves };
}
