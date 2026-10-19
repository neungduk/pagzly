/**
 * 409차 — 스타일 팩 구조 변형 중 "CSS만으로 되는 것"(모서리·가는 선·소제목 모양·체크리스트 평면화).
 * 라이브(루트의 data-pz-pack 안)와 export(.pagzly-wrap 안)가 같은 숫자·같은 규칙 목록에서 CSS를 만든다.
 * export에는 속성 선택자·::before 같은 기존 CSS만 쓴다(:has(), 컨테이너 쿼리, text-wrap 등 새 기능 없음).
 * 기본 팩은 빈 문자열이라 화면·HTML이 그대로다.
 */
import type { PackLayout } from "@/lib/style-packs";

export const PACK_RULE = {
  widthPx: 40,
  color: "rgba(27,27,24,0.3)",
  gapPx: 20,
  /** 목록 줄 사이 가는 선 */
  lineColor: "rgba(27,27,24,0.14)",
} as const;

type Flavor = "live" | "export";

/** scope: 라이브 `[data-pz-pack]`, export `.pagzly-wrap` */
export function packStructureCss(layout: PackLayout, scope: string, flavor: Flavor): string {
  const out: string[] = [];
  const S = scope;
  // 모서리 — 알약·카드·칩·표(사진·원형 아이콘은 그대로)
  if (layout.radius !== null) {
    const r = `${layout.radius}px`;
    if (flavor === "live") {
      out.push(
        `${S} [class*="rounded-"]:not(.rounded-full):not(img){border-radius:${r}!important}`,
        `${S} .rounded-full[class*="px-"],${S} [data-persona-strip]>li{border-radius:${r}!important}`,
      );
    } else {
      out.push(`${S} [style*="border-radius"]:not([style*="width:"]):not([style*="50%"]){border-radius:${r}!important}`);
    }
  }
  // 소제목 — 가는 선(제목 위). 히어로 캡션 제목은 제외
  if (layout.heading !== "center-stack" || layout.rule === "hairline") {
    const left = layout.heading === "left-eyebrow";
    const base = `${S} .pagzly-display-headline::before{content:"";display:block;width:${PACK_RULE.widthPx}px;height:1px;background:${PACK_RULE.color};margin:0 ${left ? "0" : "auto"} ${PACK_RULE.gapPx}px}`;
    if (layout.heading !== "center-stack") {
      out.push(base);
      if (left) out.push(`${S} .pagzly-display-headline{text-align:left!important}`);
      out.push(`${S} [data-hero-caption] .pagzly-display-headline::before{display:none}`);
    }
  }
  // 체크리스트 — 카드 테두리·그림자·바탕 없이 줄 사이 가는 선
  if (layout.checklist === "plain-list") {
    const li = flavor === "live" ? `${S} li.rounded-2xl.border` : `${S} .pagzly-cl-grid>li`;
    out.push(
      `${li}{background:transparent!important;box-shadow:none!important;border-width:0 0 1px 0!important;border-style:solid!important;border-color:${PACK_RULE.lineColor}!important}`,
    );
  }
  return out.join("");
}
