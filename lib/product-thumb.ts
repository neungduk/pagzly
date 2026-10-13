import type { DetailSection } from "@/lib/types/generate";
import { countSourceUses } from "@/lib/image-source-cap";
import { IMAGE_SOURCE_CAP } from "@/lib/design-tokens";

export type ProductThumbs = { compare: string | null; highlight: string | null };

/**
 * 비교 VS 헤더·요약 카드 위에 보여 줄 히어로 상품 사진.
 * 같은 소스 상한(IMAGE_SOURCE_CAP) 안에서만, 페이지 순서대로 먼저 나오는 쪽부터 쓴다.
 * 라이브·export 모두 표시 예산 적용 전 원본 섹션으로 계산해 결과를 맞춘다.
 */
export function resolveProductThumbs(sections: DetailSection[], imageUrls: string[]): ProductThumbs {
  const none: ProductThumbs = { compare: null, highlight: null };
  const hero = sections.find((s) => s.type === "hero");
  if (!hero || hero.type !== "hero") return none;
  const url = imageUrls[hero.imageIndex];
  if (typeof url !== "string" || !url.trim()) return none;
  let left = IMAGE_SOURCE_CAP.maxUses - (countSourceUses(sections).get(hero.imageIndex) ?? 0);
  const out: ProductThumbs = { ...none };
  for (const s of sections) {
    if (left <= 0) break;
    if (!out.compare && s.type === "comparison_chart" && s.presentationStyle === "checklist") {
      out.compare = url;
      left -= 1;
    } else if (!out.highlight && s.type === "highlight_box" && s.slot !== "seller_trust_evidence") {
      out.highlight = url;
      left -= 1;
    }
  }
  return out;
}
