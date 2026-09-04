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
        { role: "detail", label: "디테일", hint: "원단·봉제·카라·단추 확대. 매크로/클로즈업이면 감각 카피와 잘 맞습니다" },
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
        { role: "detail", label: "텍스처", hint: "질감·성분·매크로. 클로즈업이면 texture 슬롯과 잘 매칭됩니다" },
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
        { role: "detail", label: "원재료", hint: "재료·단면·클로즈업. 매크로 사진은 감각 카피와 잘 맞습니다" },
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

/** Vision이 반환하는 사진별 역할 판정 */
export type VisionImageRoleJudgment = {
  index: number;
  role: ProductImageRole;
  confidence: number;
  reason?: string;
  /** 114차 — 짧은 시각 키워드 2~4개 (없으면 []) */
  tags?: string[];
};

export const VISION_ROLE_CONFIDENCE_MIN = 0.5;

/**
 * 우선순위: 사용자 지정(드롭다운) > Vision(confidence≥임계) > 업로드 순서 기본값.
 * userSet[i]===true 인 인덱스는 Vision/기본값으로 덮지 않는다.
 *
 * 중요: 폼은 업로드 시 defaultRoleForIndex로 imageRoles를 미리 채운다.
 * userSet가 false이면 그 값은 "미지정 기본값"이므로 Vision이 덮어쓸 수 있다.
 * (raw가 유효 역할이라는 이유만으로 Vision을 막지 않는다 — 100차 버그 수정)
 */
export function mergeImageRolesWithVision(params: {
  imageCount: number;
  userRoles?: unknown;
  /** 인덱스가 사용자가 드롭다운으로 직접 고른 경우 true */
  userSet?: unknown;
  visionRoles?: VisionImageRoleJudgment[] | null;
  confidenceMin?: number;
}): ProductImageRole[] {
  const {
    imageCount,
    userRoles,
    userSet,
    visionRoles,
    confidenceMin = VISION_ROLE_CONFIDENCE_MIN,
  } = params;
  const userList = Array.isArray(userRoles) ? userRoles : [];
  const setFlags = Array.isArray(userSet) ? userSet : [];
  const visionByIndex = new Map<number, VisionImageRoleJudgment>();
  let lowConfSkipped = 0;
  for (const judgment of visionRoles ?? []) {
    if (
      typeof judgment?.index !== "number" ||
      judgment.index < 0 ||
      judgment.index >= imageCount ||
      !isProductImageRole(judgment.role)
    ) {
      continue;
    }
    if (judgment.confidence < confidenceMin) {
      lowConfSkipped += 1;
      continue;
    }
    visionByIndex.set(judgment.index, judgment);
  }

  const visionApplied: Array<ProductImageRole | "-"> = Array.from(
    { length: imageCount },
    () => "-",
  );
  const userApplied: Array<ProductImageRole | "-"> = Array.from(
    { length: imageCount },
    () => "-",
  );

  const final = Array.from({ length: imageCount }, (_, i) => {
    const raw = userList[i];
    const locked = setFlags[i] === true && isProductImageRole(raw);
    if (locked) {
      userApplied[i] = raw;
      return raw;
    }
    const vision = visionByIndex.get(i);
    if (vision) {
      visionApplied[i] = vision.role;
      return vision.role;
    }
    // Vision 없음: 잠금되지 않은 raw가 있으면 유지(이미 draft에서 Vision 병합된 값 포함),
    // 없으면 순서 기본값.
    if (isProductImageRole(raw)) {
      return raw;
    }
    return defaultRoleForIndex(i);
  });

  const visionCount = visionApplied.filter((r) => r !== "-").length;
  if ((visionRoles?.length ?? 0) === 0) {
    console.warn("[image-roles] vision roles 비어있음 — 순서 기본값 폴백", {
      reason: "empty_vision_input",
      rawLength: 0,
      imageCount,
    });
  } else if (visionCount === 0) {
    console.warn("[image-roles] vision roles 비어있음 — 순서 기본값 폴백", {
      reason: "all_low_confidence_or_invalid",
      rawLength: visionRoles?.length ?? 0,
      lowConfSkipped,
      imageCount,
    });
  }
  console.log(
    `[image-roles] vision=[${visionApplied.join(",")}] user=[${userApplied.join(",")}] final=[${final.join(",")}] visionCount=${visionCount} lowConfSkipped=${lowConfSkipped} visionInput=${(visionRoles ?? []).length}`,
  );
  return final;
}

/** Vision이 실제로 final에 반영된 장수 (UI 배지용) */
export function countVisionRolesApplied(
  finalRoles: ProductImageRole[],
  visionRoles: VisionImageRoleJudgment[] | null | undefined,
  userSet?: unknown,
  confidenceMin = VISION_ROLE_CONFIDENCE_MIN,
): number {
  const setFlags = Array.isArray(userSet) ? userSet : [];
  const visionByIndex = new Map<number, VisionImageRoleJudgment>();
  for (const j of visionRoles ?? []) {
    if (
      typeof j?.index === "number" &&
      isProductImageRole(j.role) &&
      j.confidence >= confidenceMin
    ) {
      visionByIndex.set(j.index, j);
    }
  }
  let n = 0;
  for (let i = 0; i < finalRoles.length; i += 1) {
    if (setFlags[i] === true) continue;
    const v = visionByIndex.get(i);
    if (v && v.role === finalRoles[i]) n += 1;
  }
  return n;
}

/** Claude Vision JSON roles 배열 파싱 */
export function parseVisionImageRoles(raw: unknown): VisionImageRoleJudgment[] {
  if (!Array.isArray(raw)) return [];
  const out: VisionImageRoleJudgment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const index = typeof rec.index === "number" ? rec.index : Number(rec.index);
    const confidence =
      typeof rec.confidence === "number" ? rec.confidence : Number(rec.confidence);
    if (!Number.isInteger(index) || index < 0) continue;
    if (!isProductImageRole(rec.role)) continue;
    if (!Number.isFinite(confidence)) continue;
    out.push({
      index,
      role: rec.role,
      confidence: Math.min(1, Math.max(0, confidence)),
      reason: typeof rec.reason === "string" ? rec.reason : undefined,
      tags: parseVisionTags(rec.tags),
    });
  }
  return out;
}

function parseVisionTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const tags: string[] = [];
  for (const t of raw) {
    if (typeof t !== "string") continue;
    const s = t.trim();
    if (s.length < 1 || s.length > 24) continue;
    tags.push(s);
    if (tags.length >= 6) break;
  }
  return tags;
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

/** 114차 — Vision 판정을 이미지 인덱스 배열로 펼침 (없으면 빈 tags) */
export function expandVisionTagsByIndex(
  visionRoles: VisionImageRoleJudgment[] | null | undefined,
  imageCount: number,
): { imageTags: string[][]; imageReasons: Array<string | undefined> } {
  const imageTags = Array.from({ length: imageCount }, () => [] as string[]);
  const imageReasons: Array<string | undefined> = Array.from(
    { length: imageCount },
    () => undefined,
  );
  for (const j of visionRoles ?? []) {
    if (
      typeof j?.index !== "number" ||
      j.index < 0 ||
      j.index >= imageCount
    ) {
      continue;
    }
    imageTags[j.index] = Array.isArray(j.tags) ? j.tags : [];
    imageReasons[j.index] = j.reason;
  }
  return { imageTags, imageReasons };
}
