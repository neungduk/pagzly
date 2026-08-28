import type { DetailSection } from "@/lib/types/generate";
import { resolveTemplateCategory } from "@/lib/section-templates";

/** 인증 문자열을 배지/표 행에 쓸 토큰으로 분리 */
export function parseCertificationTokens(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,/|·\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 40)
    .slice(0, 6);
}

const PLACEHOLDER = "판매자 확인 필요";

type SkeletonRow = { label: string; match?: RegExp };

const SPEC_SKELETONS: Record<string, SkeletonRow[]> = {
  "화장품/뷰티": [
    { label: "브랜드", match: /브랜드/ },
    { label: "제조사", match: /제조(사|업|원)?/ },
    { label: "제조국", match: /제조국|원산지/ },
    { label: "용량", match: /용량|규격|내용량/ },
    { label: "주요 성분", match: /성분|전성분/ },
    { label: "사용기한", match: /사용기한|유통기한|개봉/ },
    { label: "인증·수상", match: /인증|수상|kc|KC/ },
  ],
  "패션/의류": [
    { label: "브랜드", match: /브랜드/ },
    { label: "제조사", match: /제조/ },
    { label: "제조국", match: /제조국|원산지/ },
    { label: "소재", match: /소재|혼용|섬유/ },
    { label: "색상", match: /색상|컬러/ },
    { label: "사이즈", match: /사이즈|치수/ },
    { label: "세탁방법", match: /세탁|취급/ },
  ],
  "식품": [
    { label: "브랜드", match: /브랜드/ },
    { label: "제조사", match: /제조/ },
    { label: "원산지", match: /원산지|제조국/ },
    { label: "내용량", match: /내용량|용량/ },
    { label: "보관방법", match: /보관/ },
    { label: "유통기한", match: /유통|소비기한/ },
    { label: "인증·수상", match: /인증|수상/ },
  ],
  "전자/가전": [
    { label: "브랜드", match: /브랜드/ },
    { label: "제조사", match: /제조/ },
    { label: "모델명", match: /모델/ },
    { label: "KC 인증", match: /KC|인증/ },
    { label: "정격전압", match: /정격|전압|전력/ },
    { label: "품질보증", match: /품질|보증|A\/S/ },
    { label: "제조국", match: /제조국|원산지/ },
  ],
  "생활/리빙": [
    { label: "브랜드", match: /브랜드/ },
    { label: "제조사", match: /제조/ },
    { label: "원산지", match: /원산지|제조국/ },
    { label: "규격", match: /규격|사이즈|크기/ },
    { label: "재질", match: /재질|소재/ },
    { label: "사용연령", match: /연령|월령|대상/ },
    { label: "인증·수상", match: /인증|수상/ },
  ],
  "반려동물": [
    { label: "브랜드", match: /브랜드/ },
    { label: "제조사", match: /제조/ },
    { label: "원산지", match: /원산지|제조국/ },
    { label: "주요 성분", match: /성분|원료/ },
    { label: "급여량", match: /급여|용량|권장/ },
    { label: "적합 연령", match: /연령|월령|대상/ },
    { label: "보관방법", match: /보관/ },
    { label: "주의 성분", match: /알레르기|주의|금기/ },
  ],
};

const SHIPPING_SKELETON: SkeletonRow[] = [
  { label: "배송비", match: /배송비|배송 요금/ },
  { label: "배송기간", match: /배송기간|출고|발송/ },
  { label: "교환·환불", match: /교환|환불|반품/ },
];

function rowMatches(row: { label: string }, skel: SkeletonRow): boolean {
  if (row.label.trim() === skel.label) return true;
  if (skel.match) return skel.match.test(row.label);
  return false;
}

function resolveSkeletonValue(
  skel: SkeletonRow,
  existing: { label: string; value: string }[],
  meta: {
    brandName?: string | null;
    certifications?: string | null;
    ingredients?: string | null;
    price?: number;
  },
): string {
  const found = existing.find((r) => rowMatches(r, skel));
  const trimmed = found?.value?.trim() ?? "";
  if (trimmed && !trimmed.includes("판매자")) return trimmed;

  if (skel.label === "브랜드" && meta.brandName?.trim()) return meta.brandName.trim();
  if (skel.label === "주요 성분" && meta.ingredients?.trim()) {
    const ing = meta.ingredients.trim();
    return ing.length > 80 ? `${ing.slice(0, 77)}…` : ing;
  }
  if (skel.label === "인증·수상") {
    const certs = parseCertificationTokens(meta.certifications);
    if (certs.length > 0) return certs.join(", ");
  }
  if (skel.label === "배송비" && meta.price != null && meta.price > 0) {
    return "구매 금액·지역에 따라 달라질 수 있습니다";
  }

  return PLACEHOLDER;
}

function mergeSpecRows(
  existing: { label: string; value: string }[],
  skeleton: SkeletonRow[],
  meta: {
    brandName?: string | null;
    certifications?: string | null;
    ingredients?: string | null;
    price?: number;
  },
): { label: string; value: string }[] {
  const merged: { label: string; value: string }[] = skeleton.map((skel) => ({
    label: skel.label,
    value: resolveSkeletonValue(skel, existing, meta),
  }));

  for (const row of existing) {
    if (!merged.some((m) => m.label === row.label)) {
      merged.push(row);
    }
  }
  return merged.slice(0, 10);
}

function enrichSpecTableSection(
  section: DetailSection & { type: "spec_table" },
  category: string,
  meta: {
    brandName?: string | null;
    certifications?: string | null;
    ingredients?: string | null;
    price?: number;
  },
): DetailSection {
  const templateCat = resolveTemplateCategory(category);
  const isShipping = section.slot === "shipping_info";
  const skeleton = isShipping ? SHIPPING_SKELETON : SPEC_SKELETONS[templateCat];
  if (!skeleton) return section;

  return {
    ...section,
    heading: section.heading?.trim() || (isShipping ? "배송·교환 안내" : "상품 정보"),
    rows: mergeSpecRows(section.rows, skeleton, meta),
  };
}

/**
 * 마켓플레이스 상세는 인증·KC·수상을 CTA 배지·고시 표에 명시한다.
 * AI가 badges/spec에 빠뜨린 경우 입력 certifications를 서버가 보강한다.
 * INFO(spec_table)는 쇼핑몰 고시형 스켈레톤 행을 채워 빈 표를 방지한다.
 */
export function enrichSectionsWithProductMetadata(
  sections: DetailSection[],
  meta: {
    certifications?: string | null;
    brandName?: string | null;
    category?: string;
    ingredients?: string | null;
    price?: number;
  },
): DetailSection[] {
  const certParts = parseCertificationTokens(meta.certifications);

  return sections.map((section) => {
    if (section.type === "cta_price") {
      const existing = section.badges ?? [];
      const merged = [...existing];
      for (const c of certParts) {
        if (merged.length >= 4) break;
        const dup = merged.some(
          (b) =>
            b.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(b.toLowerCase()),
        );
        if (!dup) merged.push(c);
      }
      if (merged.length === existing.length) return section;
      return { ...section, badges: merged.slice(0, 4) };
    }
    if (section.type === "spec_table" && meta.category) {
      return enrichSpecTableSection(section, meta.category, meta);
    }
    return section;
  });
}
