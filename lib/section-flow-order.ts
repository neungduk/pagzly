import type { DetailSection } from "@/lib/types/generate";

/**
 * 상세페이지 흐름: 설득(이야기·특징·증거·사용) → 확인(구성·스펙·FAQ·주의) → 구매.
 * 템플릿 뒤쪽에 붙은 설득 슬롯(용기 디자인·작용 원리·사용 장면 등)이 FAQ·주의사항 뒤에 오면
 * 정보 영역을 지난 뒤 다시 판매 이야기가 시작돼 흐름이 끊긴다. 확인 영역 섹션만 뒤로 모으고
 * 나머지는 원래 순서를 유지한다(안정 정렬).
 */
const TAIL_RANK: Record<string, number> = {
  tradeoff_card: 0,
  package_contents: 1,
  spec_table: 2,
  size_table: 3,
  fabric_composition: 4,
  care_info: 5,
  faq: 6,
  caution: 7,
  shipping_info: 8,
  ai_disclosure: 9,
  cta_price: 10,
};

function tailRank(item: { slot?: unknown; type: string }): number | null {
  const slot = item.slot;
  if (typeof slot === "string" && slot in TAIL_RANK) return TAIL_RANK[slot]!;
  if (item.type in TAIL_RANK) return TAIL_RANK[item.type]!;
  return null;
}

/** 섹션 배열·슬롯 템플릿 공용 — 확인 영역만 뒤로 모으고 나머지는 원래 순서 */
export function orderForFlow<T extends { slot?: unknown; type: string }>(items: T[]): T[] {
  const body: T[] = [];
  const tail: { s: T; rank: number; i: number }[] = [];
  items.forEach((s, i) => {
    const rank = tailRank(s);
    if (rank == null) body.push(s);
    else tail.push({ s, rank, i });
  });
  if (tail.length === 0) return items;
  tail.sort((a, b) => a.rank - b.rank || a.i - b.i);
  const out = [...body, ...tail.map((t) => t.s)];
  return out.every((s, i) => s === items[i]) ? items : out;
}

export function orderSectionsForFlow(sections: DetailSection[]): DetailSection[] {
  return orderForFlow(sections);
}
