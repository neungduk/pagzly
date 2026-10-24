/**
 * 430B — 섹션 면 전환 구분선(디자인 V3 색). 슬롯 색 파스텔 면이 흰 면과 맞닿는 곳에 곡선(뷰티·식품·반려) 또는 사선(전자·생활) 한 종류를 얹어 면 전환을 눈에 보이게 한다.
 * CSS만 사용(섹션 ::before + border-radius / clip-path polygon) — export 안전, 새 CSS 기능 없음. 패션은 차분함 유지를 위해 구분선 없음.
 * 대상은 배경 면이 단색 파스텔/흰색으로 칠해지는 글 중심 섹션뿐이다(사진이 깔리는 섹션·인포 구간(자체 배경)은 제외).
 * 라이브는 섹션 래퍼의 data-section-index, export는 섹션 요소의 data-pz-i(buildDetailPageHtml이 붙임)로 같은 번호를 가리킨다.
 */
import { DESIGN_V4_ENABLED } from "@/lib/design-v4";
import { FLAT_PAPER, getSectionPattern, getSectionTheme, pastelFace, type ExtendedTheme } from "@/lib/design-tokens";
import { resolveTemplateCategory } from "@/lib/section-templates";

export type DividerStyle = "wave" | "slant";

/** 카테고리 → 구분선 종류(없으면 null) */
export function dividerStyleFor(category: string | undefined | null): DividerStyle | null {
  const cat = resolveTemplateCategory(category ?? "");
  if (cat === "화장품/뷰티" || cat === "식품" || cat === "반려동물") return "wave";
  if (cat === "전자/가전" || cat === "생활/리빙") return "slant";
  return null;
}

/** 단색 면을 쓰는 글 중심 섹션(인포 구간 유형은 info가 켜지면 제외) */
const PLAIN_FACE = new Set(["checklist", "brand_story", "target_persona", "tradeoff_card", "faq", "spec_table", "review_highlight"]);
const INFO_TYPES = new Set(["highlight_box", "usage_steps", "stat_infographic", "caution", "comparison_table"]);

type SectionLike = { type: string; layout?: string; slot?: string };

/** 사진이 면을 대신하는 image_text 배치(말풍선·주석)와 인포 퀵포인트 카드는 단색 면이 아니다 */
const PHOTO_FACE_LAYOUT = new Set(["callout", "annotated"]);
const isPlainImageText = (s: SectionLike, infoOn: boolean) => s.type === "image_text" && !PHOTO_FACE_LAYOUT.has(s.layout ?? "") && !(infoOn && (s.slot === "quick_points" || s.slot === "feature_callout"));

/** 각 표시 섹션의 단색 면(없으면 null = 사진·자체 배경) */
export function faceSequence(sections: ReadonlyArray<SectionLike>, ext: ExtendedTheme, category: string | undefined | null, info: string | undefined): Array<string | null> {
  const infoOn = !!info && info !== "calm";
  let body = 0;
  return sections.map((s) => {
    if (s.type === "hero") return null;
    const idx = body;
    body += 1;
    if (!PLAIN_FACE.has(s.type) && !(!infoOn && INFO_TYPES.has(s.type)) && !isPlainImageText(s, infoOn)) return null;
    const pattern = getSectionPattern(idx, s.type);
    if (pattern === "A" || pattern === "D") return FLAT_PAPER;
    if (pattern === "C") return null;
    return pastelFace(getSectionTheme(ext, s.type, idx), category ?? undefined, pattern === "E" ? 0.012 : 0);
  });
}

/** 448차 — 물결 띠는 좌우 6%씩 구간 밖으로 나가(left:-6%·width:112%) 구간이 가로로 안 잘리면 360폭에서 가로 스크롤(+22px)이 생겼다 → v4는 구간을 가로로만 clip(세로·sticky는 그대로) */
const H = 26;

export function dividerCss(o: { scope: string; mode: "live" | "export"; sections: ReadonlyArray<SectionLike>; ext: ExtendedTheme; category: string | undefined | null; info: string | undefined }): string {
  const style = dividerStyleFor(o.category);
  if (!style) return "";
  const faces = faceSequence(o.sections, o.ext, o.category, o.info);
  const sel = (i: number) => (o.mode === "live" ? `${o.scope} [data-section-index="${i}"]>section` : `${o.scope} section[data-pz-i="${i}"]`);
  const out: string[] = [];
  for (let i = 1; i < faces.length; i += 1) {
    const prev = faces[i - 1], cur = faces[i];
    if (!prev || !cur || prev === cur) continue; // 둘 다 단색 면이고 색이 다를 때만
    const shape =
      style === "wave"
        ? `left:-6%;width:112%;height:${H}px;border-radius:0 0 50% 50%/0 0 100% 100%`
        : `left:0;width:100%;height:${H - 4}px;clip-path:polygon(0 0,100% 0,0 100%)`;
    out.push(`${sel(i)}{position:relative${DESIGN_V4_ENABLED ? ";overflow-x:clip" : ""}}${sel(i)}::before{content:"";position:absolute;top:-1px;${shape};background:${prev};pointer-events:none;z-index:1}`);
  }
  return out.join("");
}
