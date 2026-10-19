import type { DetailSection } from "@/lib/types/generate";
import { orderSectionsForFlow } from "@/lib/section-flow-order";
import { limitBoldBlocks } from "@/lib/detail-visual-rhythm";
import { enforceImageSourceCapIndexed } from "@/lib/image-source-cap";
import { assignPersonaStrip, type StripImageHints } from "@/lib/persona-strip";
import { imageSourceGroups, type ImageHashByUrl } from "@/lib/gallery-dedupe";
import { FASHION_CATEGORY, isWornFashionPhoto } from "@/lib/fashion-composite-policy";

export type DisplaySections = {
  sections: DetailSection[];
  /** sourceIndexes[i] = 표시 i번째 섹션의 입력 인덱스 (편집 콜백을 원본 위치로 되돌릴 때) */
  sourceIndexes: number[];
};

const DANGLING_TAIL = /[\s,，、·;:\-–—]+$/u;

/** 말풍선은 긴 문구를 잘라 만든 경우가 많아 끝에 쉼표·가운뎃점이 남는다 — 표시할 때만 떼어낸다 */
function trimCalloutTail(section: DetailSection): DetailSection {
  if (section.type !== "image_text" || !section.callout || !DANGLING_TAIL.test(section.callout)) return section;
  const callout = section.callout.replace(DANGLING_TAIL, "");
  return callout ? { ...section, callout } : section;
}

const HEADING_NOISE = /[\s.,!?·:;'"“”‘’()\[\]-]+/gu;
/** 제목이 같은지 볼 때 띄어쓰기·문장부호는 무시한다 */
const headingKey = (heading: string) => heading.replace(HEADING_NOISE, "").toLowerCase();
/** 바로 앞 제목 있는 섹션 2곳 안에 같은 제목이 있으면 겹친 것으로 본다(사이에 짧은 띠 섹션이 끼는 경우 포함) */
const REPEAT_WINDOW = 2;

/** 제목을 빼도 빈 머리 여백이 남지 않는 섹션(라이브 TwoToneTitle·export twoToneDh2가 빈 제목이면 아무것도 그리지 않음) */
function canHideHeading(section: DetailSection): boolean {
  return section.type === "image_text" && (section.layout === "callout" || section.slot === "feature_callout");
}

/** 같은 제목이 연달아 나오면 뒤쪽 제목만 표시에서 뺀다 — 새 문구를 만들지 않고, 섹션·번호는 그대로 둔다 */
function hideRepeatedHeadings(sections: DetailSection[]): DetailSection[] {
  const recent: string[] = [];
  return sections.map((section) => {
    if (section.type === "hero" || !("heading" in section) || typeof section.heading !== "string") return section;
    const key = headingKey(section.heading);
    if (!key) return section;
    const repeated = recent.includes(key);
    recent.push(key);
    if (recent.length > REPEAT_WINDOW) recent.shift();
    return repeated && canHideHeading(section) ? ({ ...section, heading: "" } as DetailSection) : section;
  });
}

/** 요약 카드(compact)와 바로 옆 말풍선 카드가 같은 본문이면 요약 카드는 같은 사실을 한 번 더 읊는 것뿐이다 */
const ECHO_WINDOW = 2;
const isCompactSummary = (s: DetailSection) => s.type === "image_text" && s.layout === "compact";
const isCallout = (s: DetailSection) => s.type === "image_text" && (s.layout === "callout" || s.slot === "feature_callout");
const bodyKey = (s: DetailSection) => (s.type === "image_text" ? headingKey(s.body ?? "") : "");

function echoSummaryIndexes(sections: DetailSection[]): Set<number> {
  const out = new Set<number>();
  sections.forEach((s, i) => {
    if (!isCompactSummary(s)) return;
    const key = bodyKey(s);
    if (!key) return;
    for (let j = Math.max(0, i - ECHO_WINDOW); j <= Math.min(sections.length - 1, i + ECHO_WINDOW); j += 1) {
      if (j !== i && isCallout(sections[j]!) && bodyKey(sections[j]!) === key) out.add(i);
    }
  });
  return out;
}

/**
 * 405차 — 패션 초반 구성: 착용컷이 든 첫 갤러리를 히어로 바로 뒤(요약 띠·내비 다음 첫 본문)로 앞당긴다.
 * 패션 상세는 착용 사진으로 첫 화면을 이어 가는데, 생성 순서대로면 히어로 뒤에 고민·브랜드·포인트 글 카드가 먼저 온다.
 * 갤러리는 앞 섹션을 가리키는 문구가 없는 사진 묶음이라 옮겨도 글 흐름이 깨지지 않는다. 섹션·문구는 그대로, 순서만 바꾼다.
 * 패션이 아니거나, 히어로가 맨 앞이 아니거나, 착용컷이 든 갤러리가 없으면 그대로 둔다.
 */
export function pullWornGalleryForward(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
): DetailSection[] {
  if (category !== FASHION_CATEGORY || sections[0]?.type !== "hero") return sections;
  const at = sections.findIndex(
    (s, i) => i > 1 && s.type === "gallery" && s.imageIndexes.some((n) => isWornFashionPhoto(category, roles?.[n])),
  );
  if (at < 0) return sections;
  const out = [...sections];
  const [gallery] = out.splice(at, 1);
  out.splice(1, 0, gallery!);
  return out;
}

/**
 * 406차 — 패션 갤러리 안에서 착용컷(착장·코디)이 디테일·평면컷보다 앞 칸을 먼저 받게 순서만 바꾼다(안정 정렬).
 * 갤러리 첫 칸이 큰 사진이라, 착용컷이 앞에 와야 "모델 착용 사진 연속"으로 보인다. 사진을 빼거나 더하지 않는다.
 * 역할 정보가 없거나 패션이 아니면 그대로 둔다.
 */
function wornFirstInGallery(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
): DetailSection[] {
  if (category !== FASHION_CATEGORY || !roles?.length) return sections;
  return sections.map((section) => {
    if (section.type !== "gallery") return section;
    const worn = section.imageIndexes.filter((n) => isWornFashionPhoto(category, roles[n]));
    if (worn.length === 0 || worn.length === section.imageIndexes.length) return section;
    const rest = section.imageIndexes.filter((n) => !isWornFashionPhoto(category, roles[n]));
    const next = [...worn, ...rest];
    return next.every((n, i) => n === section.imageIndexes[i]) ? section : { ...section, imageIndexes: next };
  });
}

/**
 * 405차 — 패션 히어로가 착용컷이면 사진을 위쪽 기준으로 맞춘다. 세로 전신 원본(2:3)이 4:5 히어로 칸에 가운데 기준으로
 * 들어가면 넓은 폭(750)에서 위아래가 잘려 머리가 브랜드 알약 높이까지 올라간다. 좁은 폭(390)은 좌우만 잘려 영향이 없다.
 */
function anchorWornHeroTop(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
): DetailSection[] {
  return sections.map((section) =>
    section.type === "hero" && isWornFashionPhoto(category, roles?.[section.imageIndex])
      ? { ...section, photoTopAnchored: true }
      : section,
  );
}

/**
 * 404차 — 패션 착용컷(착장·코디)은 원본 그대로 쓰여 얼굴이 사진 위쪽에 들어 있다. STEP 태그(사진 왼쪽 위)가
 * 얼굴을 덮으므로, 단계 사진 중 착용컷이 하나라도 있으면 그 섹션의 태그를 모두 글 칸으로 옮긴다(섹션 안 모양 통일).
 * 인물 검출이 꺼져 있어 사진 내용 대신 역할로 판단한다. 문구는 그대로("STEP 0N"), 위치만 바뀐다.
 */
function markStepBadgesOffPeople(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
): DetailSection[] {
  return sections.map((section) => {
    if (section.type !== "step_card") return section;
    const hasPerson = section.steps.some((step) => isWornFashionPhoto(category, roles?.[step.imageIndex]));
    return hasPerson ? { ...section, stepBadgeOffImage: true } : section;
  });
}

/**
 * 표시 단계 공용 규칙 — 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 같은 입력으로 부른다.
 * 저장 데이터는 바꾸지 않는다: 흐름 순서 → (패션: 착용컷 갤러리 앞당김) → 굵은 블록 1개 → 같은 촬영본 사진 상한 → 말풍선과 본문이 같은 요약 카드 숨김 → 말풍선 끝 문장부호 → 고민 사진 띠 → 겹친 제목 숨김.
 * 옛 세션(생성 당시 규칙이 없던 것)도 열 때 같은 결과가 된다. 새 세션에는 결과가 그대로다(멱등).
 * 편집 중에는 섹션 내용이 원본과 같아야 저장이 안전하므로 순서만 맞춘다.
 */
export function applyDisplayRules(
  sections: DetailSection[],
  imageUrls: readonly string[],
  opts: { editing?: boolean; imageHashByUrl?: ImageHashByUrl; category?: string } & StripImageHints = {},
): DisplaySections {
  const ordered = pullWornGalleryForward(orderSectionsForFlow(sections), opts.category, opts.roles);
  const orderIndexes = ordered.map((s) => sections.indexOf(s));
  if (opts.editing) return { sections: ordered, sourceIndexes: orderIndexes };
  const sourceOf = imageSourceGroups(imageUrls, opts.imageHashByUrl);
  const capped = enforceImageSourceCapIndexed(limitBoldBlocks(ordered), imageUrls.length, undefined, sourceOf);
  const echoes = echoSummaryIndexes(capped.sections);
  const kept = capped.sections.filter((_, i) => !echoes.has(i));
  return {
    // 패션 사람 사진 규칙(404~406차): STEP 태그를 사진 밖으로 → 착용컷 히어로 위쪽 기준 → 갤러리 착용컷 먼저
    sections: [markStepBadgesOffPeople, anchorWornHeroTop, wornFirstInGallery].reduce(
      (acc, rule) => rule(acc, opts.category, opts.roles),
      hideRepeatedHeadings(
        assignPersonaStrip(kept.map(trimCalloutTail), imageUrls.length, sourceOf, {
          roles: opts.roles,
          origins: opts.origins,
        }),
      ),
    ),
    sourceIndexes: capped.sourceIndexes.filter((_, i) => !echoes.has(i)).map((i) => orderIndexes[i]!),
  };
}
