/**
 * 104차 C — 역할 공급 부족 감지 (순수 함수, API 없음)
 */
import type { ProductImageRole } from "@/lib/image-roles";

export type RoleShortageWarning = {
  missingRoles: ProductImageRole[];
  message: string;
  /** 성분/질감 슬롯을 텍스트 전용으로 돌릴지 */
  preferTextOnlySlots: string[];
};

const BEAUTY_NEEDED: ProductImageRole[] = ["hero", "detail", "package"];

/**
 * Vision/병합된 image_roles를 보고 생성 전 경고·대체 슬롯을 결정한다.
 */
export function detectRoleShortages(params: {
  roles: ProductImageRole[];
  category?: string;
}): RoleShortageWarning | null {
  const { roles, category } = params;
  if (roles.length === 0) return null;

  const counts = new Map<ProductImageRole, number>();
  for (const r of roles) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }

  const needed =
    category === "화장품/뷰티" || !category
      ? BEAUTY_NEEDED
      : (["hero", "detail", "lifestyle", "package"] as ProductImageRole[]);

  const missing = needed.filter((r) => (counts.get(r) ?? 0) === 0);
  const detailCount = counts.get("detail") ?? 0;
  const packageCount = counts.get("package") ?? 0;
  const allStudioLike =
    roles.every((r) => r === "hero" || r === "detail" || r === "other" || r === "package") &&
    detailCount <= 1 &&
    packageCount === 0;

  const preferTextOnlySlots: string[] = [];
  const parts: string[] = [];

  if (missing.includes("detail") || detailCount === 0 || allStudioLike) {
    preferTextOnlySlots.push("ingredient_highlight", "texture_feel", "macro_detail");
    parts.push("성분·질감 매크로 컷이 부족합니다. 성분/질감 섹션은 텍스트·일러스트로 대체됩니다.");
  } else if (detailCount < 2) {
    preferTextOnlySlots.push("texture_feel");
    parts.push("디테일 컷이 1장뿐입니다. 질감 섹션은 텍스트 위주로 구성됩니다.");
  }

  if (missing.includes("package")) {
    parts.push("패키지(박스) 컷이 없습니다. 패키지 섹션에 제품 사진이 들어갈 수 있습니다.");
  }

  if (parts.length === 0) return null;

  return {
    missingRoles: missing,
    message: parts.join(" "),
    preferTextOnlySlots: [...new Set(preferTextOnlySlots)],
  };
}
