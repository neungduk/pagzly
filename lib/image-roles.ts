/**
 * 업로드 사진의 "역할" — 같은 팩샷만 올리면 배정을 아무리 잘해도 같아 보임.
 * 판매자가 역할 태그를 고르면 슬롯 prefer에 연결한다.
 */

export const PRODUCT_IMAGE_ROLES = [
  "hero",
  "detail",
  "lifestyle",
  "package",
  "other",
] as const;

export type ProductImageRole = (typeof PRODUCT_IMAGE_ROLES)[number];

export type ImageRoleGuide = {
  role: ProductImageRole;
  label: string;
  hint: string;
};

/** 카테고리별 업로드 안내 (역할 믹스) */
export function getUploadRoleGuide(category: string): {
  title: string;
  summary: string;
  roles: ImageRoleGuide[];
} {
  if (category === "의류/패션") {
    return {
      title: "패션 사진 역할",
      summary:
        "착장·디테일·코디를 섞어 올리세요. 같은 각도 팩샷만 7장이면 상세가 단조로워집니다.",
      roles: [
        { role: "hero", label: "착장", hint: "모델/전신·대표 착용컷 (1장+)" },
        { role: "detail", label: "디테일", hint: "원단·봉제·카라·단추 확대" },
        { role: "lifestyle", label: "코디", hint: "매치·장면·다른 아이템과 함께" },
        { role: "package", label: "패키지", hint: "택·포장·배송 구성 (있으면)" },
        { role: "other", label: "기타", hint: "컬러칩·사이즈 참고 등" },
      ],
    };
  }
  if (category === "화장품/뷰티") {
    return {
      title: "뷰티 사진 역할",
      summary: "정면·텍스처·사용감·패키지를 섞어 올리세요. 병만 반복되면 성분이 안 살아납니다.",
      roles: [
        { role: "hero", label: "정면", hint: "대표 제품 컷" },
        { role: "detail", label: "텍스처", hint: "질감·성분·매크로" },
        { role: "lifestyle", label: "사용감", hint: "발색·바르는 장면" },
        { role: "package", label: "패키지", hint: "박스·구성품" },
        { role: "other", label: "기타", hint: "부가 컷" },
      ],
    };
  }
  if (category === "식품/건강기능식품") {
    return {
      title: "식품 사진 역할",
      summary: "완성/플레이팅·원재료·패키지를 섞어 올리세요.",
      roles: [
        { role: "hero", label: "완성", hint: "플레이팅·대표 컷" },
        { role: "detail", label: "원재료", hint: "재료·단면·클로즈업" },
        { role: "lifestyle", label: "장면", hint: "먹는/활용 장면" },
        { role: "package", label: "패키지", hint: "박스·라벨" },
        { role: "other", label: "기타", hint: "부가 컷" },
      ],
    };
  }
  if (category === "전자제품") {
    return {
      title: "전자제품 사진 역할",
      summary: "제품 정면·포트/버튼 디테일·사용 장면·패키지를 섞어 올리세요.",
      roles: [
        { role: "hero", label: "정면", hint: "대표 제품 컷 (1장+)" },
        { role: "detail", label: "디테일", hint: "포트·버튼·스펙 라벨 확대" },
        { role: "lifestyle", label: "사용", hint: "실사용·설치·연출 장면" },
        { role: "package", label: "패키지", hint: "박스·구성품·매뉴얼" },
        { role: "other", label: "기타", hint: "비교·스펙 참고 등" },
      ],
    };
  }
  if (category === "반려동물") {
    return {
      title: "반려동물 사진 역할",
      summary: "제품·급여/사용 장면·성분 라벨·패키지를 섞어 올리세요.",
      roles: [
        { role: "hero", label: "제품", hint: "대표 제품·패키지 컷" },
        { role: "detail", label: "성분·라벨", hint: "성분표·용량·주의 문구" },
        { role: "lifestyle", label: "급여·사용", hint: "반려동물과 함께하는 장면" },
        { role: "package", label: "패키지", hint: "박스·구성·사이즈 참고" },
        { role: "other", label: "기타", hint: "부가 컷" },
      ],
    };
  }
  if (category === "생활용품") {
    return {
      title: "생활용품 사진 역할",
      summary: "정면·디테일·사용 장면·패키지를 섞어 올리세요.",
      roles: [
        { role: "hero", label: "정면", hint: "대표 상품 컷" },
        { role: "detail", label: "디테일", hint: "소재·기능부 확대" },
        { role: "lifestyle", label: "사용", hint: "실사용·연출 장면" },
        { role: "package", label: "패키지", hint: "박스·구성" },
        { role: "other", label: "기타", hint: "부가 컷" },
      ],
    };
  }
  return {
    title: "상품 사진 역할",
    summary:
      "정면·디테일·사용 장면·패키지를 섞어 올리세요. 같은 컷만 많으면 AI도 반복해 보입니다.",
    roles: [
      { role: "hero", label: "정면", hint: "대표 상품 컷" },
      { role: "detail", label: "디테일", hint: "확대·소재·기능부" },
      { role: "lifestyle", label: "사용", hint: "쓰는 장면·연출" },
      { role: "package", label: "패키지", hint: "박스·구성" },
      { role: "other", label: "기타", hint: "부가 컷" },
    ],
  };
}

/** 업로드 순서 기본 역할 — 안내와 맞추기 */
export function defaultRoleForIndex(index: number): ProductImageRole {
  if (index === 0) return "hero";
  if (index === 1) return "detail";
  if (index === 2) return "lifestyle";
  if (index === 3) return "package";
  return "other";
}

export function isProductImageRole(value: unknown): value is ProductImageRole {
  return (
    typeof value === "string" &&
    (PRODUCT_IMAGE_ROLES as readonly string[]).includes(value)
  );
}

export function normalizeImageRoles(
  roles: unknown,
  imageCount: number,
): ProductImageRole[] {
  const list = Array.isArray(roles) ? roles : [];
  return Array.from({ length: imageCount }, (_, i) => {
    const raw = list[i];
    return isProductImageRole(raw) ? raw : defaultRoleForIndex(i);
  });
}

/** 역할 → 업로드 인덱스 (없으면 undefined) */
export function firstIndexWithRole(
  roles: ProductImageRole[],
  role: ProductImageRole,
): number | undefined {
  const i = roles.findIndex((r) => r === role);
  return i >= 0 ? i : undefined;
}

export function indexesWithRole(
  roles: ProductImageRole[],
  role: ProductImageRole,
): number[] {
  return roles
    .map((r, i) => (r === role ? i : -1))
    .filter((i) => i >= 0);
}
