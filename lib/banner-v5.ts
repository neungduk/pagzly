/**
 * 468차 V5 — 일러스트 배너를 아키타입에 묶는다. 사진 배너는 전부 "전면 스크림 + 어두운 카드"여서 8종 모두에서 화면의 큰 진한 덩어리로 남았다(466차 진한 면 지표는 배너를 제외하고 쟀다).
 * 아키타입 토큰 `banner: [첫 배너, 다음 배너]`를 페이지의 배너 순서대로 번갈아 입힌다 → 연속 배너가 같은 값이 되지 않는다(결정적, 시드 없음).
 * 표시용 복사본에 `v5Banner`만 붙이며(원본 불변), V5 꺼짐·편집 모드에서는 호출되지 않는다. `BANNER_STYLE` 기본값은 건드리지 않는다.
 */
import type { DetailSection } from "@/lib/types/generate";
import type { ArchetypeTokens } from "@/lib/page-archetype-v5";

export function planBannersV5(sections: DetailSection[], t: ArchetypeTokens): DetailSection[] {
  let k = 0;
  return sections.map((s) => {
    if (s.type !== "illustration_banner") return s;
    const v = t.banner[k % 2]!;
    k += 1;
    return { ...s, v5Banner: v };
  });
}
