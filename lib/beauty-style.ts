/**
 * 419차 — 뷰티 표현 변경 플래그와 뷰티 인포 강화. 꺼 두면(또는 뷰티가 아니면) 418차 결과와 같은 화면·HTML이 나온다.
 * 대상: 글·사진 일치 게이트(photo-text-match), 뷰티 인포 강화(415차 info 축 + 구매 카드·퀵포인트), 뷰티 히어로 크롭, 장면(합성) 슬롯 표시.
 * 카피 프롬프트·비전 비용 절감은 화면이 아니라 호출 쪽이라 이 플래그와 별개다.
 */
import { BODY_LINE_HEIGHT } from "@/lib/typo-v4";
import type { InfoColors, InfoLevel } from "@/lib/info-style";
import { DESIGN_V4_ENABLED } from "@/lib/design-v4";
import { depthShadowOf } from "@/lib/design-tokens-v4";

/** 기본 켬. 끄려면 NEXT_PUBLIC_BEAUTY_STYLE=off로 서버를 시작한다(418차와 같은 화면 — 전/후 캡처·되돌리기용) */
export const BEAUTY_STYLE_ENABLED = process.env.NEXT_PUBLIC_BEAUTY_STYLE !== "off";
export const BEAUTY_CATEGORY = "화장품/뷰티";
/** 뷰티 인포 기본 강도(415차 info 축: calm=418차 모습) */
export const BEAUTY_INFO_DEFAULT: InfoLevel = "bold";

/** enabled는 테스트가 flag off를 흉내 낼 때만 넘긴다 */
export const beautyStyleOn = (category: string | undefined | null, enabled: boolean = BEAUTY_STYLE_ENABLED): boolean =>
  enabled && category === BEAUTY_CATEGORY;

type LayoutLike = { info: InfoLevel; beautyInfo?: boolean };

/**
 * 뷰티면 레이아웃의 info를 기본 bold로 올리고 beautyInfo 표식을 단다(라이브·export가 같은 함수로).
 * 뷰티가 아니거나 flag off면 같은 객체를 그대로 돌려준다(패션·기존 세션 출력 불변).
 */
export function beautyInfoLayout<T extends LayoutLike>(layout: T, category: string | undefined | null, enabled: boolean = BEAUTY_STYLE_ENABLED): T {
  if (!beautyStyleOn(category, enabled)) return layout;
  return { ...layout, info: layout.info === "calm" ? BEAUTY_INFO_DEFAULT : layout.info, beautyInfo: true };
}

/** 뷰티 전용 표식 — 라이브(JSX 스프레드)·export(문자열). beautyInfo가 아니면 비어 있다 */
export const beautyData = (layout: { beautyInfo?: boolean } | null | undefined, key: string): Record<string, string> =>
  layout?.beautyInfo ? { "data-info": key } : {};
export const beautyIp = (layout: { beautyInfo?: boolean } | null | undefined, key: string): Record<string, string> =>
  layout?.beautyInfo ? { "data-ip": key } : {};
export const beautyAttr = (layout: { beautyInfo?: boolean } | null | undefined, key: string): string =>
  layout?.beautyInfo ? ` data-info="${key}"` : "";
export const beautyIpAttr = (layout: { beautyInfo?: boolean } | null | undefined, key: string): string =>
  layout?.beautyInfo ? ` data-ip="${key}"` : "";

const IMP = "!important";

/**
 * 뷰티 전용 인포 CSS — 구매 카드(buy)와 퀵포인트(quick). 415차 토큰 재사용: 액센트 채움 + 흰 글자(infoColorsOf가 4.5:1 보장),
 * 큰 숫자, 본문 15px 이상, 보조 문구 12px 이상. 문구는 그대로이고 크기·색·카드 모양만 바꾼다.
 * 라이브(`[data-pz-info]`)·export(`.pagzly-wrap`)가 같은 규칙 목록. calm이면 빈 문자열.
 */
export function beautyInfoCss(level: InfoLevel | undefined, scope: string, c: InfoColors): string {
  if (!level || level === "calm") return "";
  const dr = level === "dramatic";
  const W = c.paper;
  const out: string[] = [];
  const rule = (sel: string, decl: string) => out.push(`${sel}{${decl.split(";").filter(Boolean).map((d) => `${d}${IMP}`).join(";")}}`);

  // ── 구매 카드: 액센트 채움 띠 · 가격 크게 · 혜택 칩 2열 · 큰 CTA 버튼 ──
  const B = `${scope} [data-info="buy"]`;
  const ip = (k: string) => `${B} [data-ip="${k}"]`;
  rule(B, `background:${c.accent};clip-path:none;margin-top:0;padding-top:${DESIGN_V4_ENABLED ? 64 : 56}px;padding-bottom:${DESIGN_V4_ENABLED ? 64 : 56}px;border-top:0;color:${W}`); // 442차 — v4 여백 3단(56 → 64)
  rule(`${ip("kicker")},${ip("name")}`, `color:${DESIGN_V4_ENABLED ? W : "rgba(255,255,255,0.88)"};opacity:1`); // 450차: v4는 흰색 그대로(0.88은 액센트 면 위 4.2~4.4:1)
  rule(ip("price"), `font-size:${dr ? 72 : 60}px;font-weight:900;line-height:1;letter-spacing:-0.04em;color:${W}`);
  rule(ip("chip"), `background:${DESIGN_V4_ENABLED ? "rgba(10,10,10,0.22)" : "rgba(255,255,255,0.2)"};color:${W};font-size:14px;font-weight:600`); // 450차: v4는 어두운 덧칠(흰 덧칠은 면을 밝혀 3.4~3.8:1)
  rule(ip("badges"), `display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:24rem;margin:28px auto 0;justify-content:stretch`);
  rule(`${ip("badges")}>span`, `display:flex;align-items:center;justify-content:center;text-align:center;padding:14px 10px;font-size:14px;font-weight:700;${DESIGN_V4_ENABLED ? `line-height:${BODY_LINE_HEIGHT};` : ""}background:${W};color:${c.deep};border:0;border-radius:12px;clip-path:none`);
  rule(ip("cta"), `display:block;width:100%;max-width:24rem;margin:32px auto 0;padding:22px 16px;box-sizing:border-box;font-size:20px;font-weight:800;text-align:center;border-radius:14px;background:${c.deep};color:${W};box-shadow:0 14px 32px rgba(0,0,0,0.35)`);
  rule(ip("note"), `color:${DESIGN_V4_ENABLED ? W : "rgba(255,255,255,0.88)"};font-size:${DESIGN_V4_ENABLED ? 14 : 13}px;margin-top:16px;opacity:1`);

  // ── 퀵포인트: 카드 한 장(왼쪽 액센트 띠) · 제목 22px · 본문 16px · 썸네일 112px ──
  const Q = `${scope} [data-info="quick"]`;
  // 444차 — v4: 퀵포인트 한 줄(섹션 하나)의 위·아래 여백 12px는 3단 스케일 밖이라(린트 R17) 섹션 여백 0 + 카드 바깥 여백 12로 같은 간격을 낸다. 카드 깊이는 깊이 토큰(soft)
  rule(Q, DESIGN_V4_ENABLED ? `background:${c.soft};padding-top:0;padding-bottom:0;display:flow-root` : `background:${c.soft};padding-top:12px;padding-bottom:12px`);
  rule(`${Q}>div`, `background:${W};border-left:6px solid ${c.accent};border-bottom:0;border-radius:16px;padding:18px 20px;gap:18px;box-shadow:${DESIGN_V4_ENABLED ? depthShadowOf("soft", "#1B1B18") : "0 8px 22px rgba(27,27,24,0.1)"}${DESIGN_V4_ENABLED ? ";margin:12px 0" : ""}`);
  rule(`${Q} h3`, `font-size:22px;font-weight:800;line-height:1.3;color:${c.deep}`);
  rule(`${Q} p`, `font-size:16px;line-height:1.6;color:${c.ink};margin-top:6px`);
  rule(`${Q} img`, `width:112px;height:112px;border-radius:14px`);
  return out.join("");
}

export type BeautyAccentSource = "seller" | "product" | "theme" | "photo";
const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * 뷰티 포인트색 출처 규칙(419차 제안 — 렌더에는 아직 연결하지 않았다, 보고서 캡처 3안 근거):
 * 판매자가 입력한 색 > 제품 컷아웃 주조색 > 상품 theme > 사진 배경 hue. 앞 출처가 유효한 #RRGGBB가 아니면 다음으로 넘어간다.
 * 418차 가디건 아닌 뷰티 세션은 theme이 사진의 파란 스튜디오 배경에서 나와 제품(노랑·검정)과 어긋났다.
 */
export function chooseBeautyAccent(input: { sellerHex?: string | null; productHex?: string | null; themeHex?: string | null; photoHex?: string | null }): { source: BeautyAccentSource; hex: string } | null {
  const order: Array<[BeautyAccentSource, string | null | undefined]> = [
    ["seller", input.sellerHex],
    ["product", input.productHex],
    ["theme", input.themeHex],
    ["photo", input.photoHex],
  ];
  for (const [source, hex] of order) if (hex && HEX.test(hex)) return { source, hex: hex.toUpperCase() };
  return null;
}
