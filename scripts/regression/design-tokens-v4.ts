/**
 * 회귀 — 443차 1 토큰 단일 소스(lib/design-tokens-v4.ts): 토큰 키 누락·타입 검사, 라이브(style 객체)와 export(인라인 문자열)가 같은 키에서 같은 값,
 * 기존 v4 코드(타입 스케일·페르소나·여백·반경·그림자·hairline·구분선)가 토큰 파일 값을 그대로 읽는지, 하한(본문 14·라벨 12) 호출 0.
 */
import fs from "node:fs";
import { PERSONA_SINGLE } from "../../lib/design-tokens";
import { PAD_TIERS, RADIUS_TIERS, SHADOW_ALPHA_TIERS } from "../../lib/mood";
import { depthShadow, hairline } from "../../lib/palette-v4";
import { HEADING_SECTION_PX, TYPE_SCALE_V4 } from "../../lib/type-treatments";
import * as T from "../../lib/design-tokens-v4";

export const name = "토큰 단일 소스 — 키 누락·라이브/export 같은 값·기존 v4 코드가 토큰을 읽음";

const INK = "#1B1B18";
const REQUIRED: T.TokenKey[] = [
  "display", "heading-large", "heading-mid", "heading-small", "body", "body-small", "label",
  "space-sm", "space-md", "space-lg", "gap-xs", "gap-sm", "gap-md", "radius-sm", "radius-md", "radius-lg",
  "line-tight", "line-snug", "line-normal", "line-relaxed", "line-loose",
  "shadow-none", "shadow-soft", "shadow-float", "hairline",
];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // 1) 키 누락
  for (const k of REQUIRED) if (!T.TOKEN_KEYS.includes(k)) fails.push(`토큰 키 누락: ${k}`);
  for (const k of T.TOKEN_KEYS) if (!REQUIRED.includes(k)) fails.push(`검사 목록에 없는 토큰: ${k}`);
  // 2) 라이브(객체)·export(문자열)가 같은 키에서 같은 값 — 문자열을 속성 단위로 쪼개 객체와 비교
  const camel = (p: string) => p.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  for (const k of T.TOKEN_KEYS) {
    const str = T.tokenStyle(k, INK);
    const obj = T.tokenStyleObject(k, INK);
    // 값 안에 ':'·';'가 없는 선언만 쓰므로 단순 분해(rgba의 ', '는 세미콜론이 아님)
    const parsed = Object.fromEntries(str.split(";").map((d) => { const i = d.indexOf(":"); return [camel(d.slice(0, i)), d.slice(i + 1)]; }));
    if (JSON.stringify(parsed) !== JSON.stringify(obj)) fails.push(`${k}: export 문자열과 라이브 객체 값이 다름 ${str}`);
    if (!str || /undefined|NaN/.test(str)) fails.push(`${k}: 값 비어 있음/깨짐 ${str}`);
    if (/clip-path|mask|mix-blend|text-wrap|-webkit-text-stroke|:has\(/.test(str)) fails.push(`${k}: export 금지 기법`);
  }
  let threw = false;
  try { T.tokenStyle("shadow-soft"); } catch { threw = true; }
  if (!threw) fails.push("잉크색 없는 그림자 토큰이 오류 없이 만들어짐");
  // 3) 값 자체: 위계 3단 단조·하한
  const h = [T.TYPE_V4["heading-large"], T.TYPE_V4["heading-mid"], T.TYPE_V4["heading-small"]];
  if (!(h[0]!.size > h[1]!.size && h[1]!.size > h[2]!.size)) fails.push("제목 위계 크기가 대>중>소가 아님");
  if (!(h[0]!.w >= h[1]!.w && h[1]!.w >= h[2]!.w)) fails.push("제목 위계 굵기가 대≥중≥소가 아님");
  if (T.TYPE_V4.body.size < T.MIN_BODY_PX || T.TYPE_V4["body-small"].size < T.MIN_BODY_PX) fails.push("본문 14px 미만");
  if (T.TYPE_V4.label.size < T.MIN_LABEL_PX) fails.push("라벨 12px 미만");
  if (T.tokenStyle("hairline", INK) !== "border:1px solid rgba(27, 27, 24, 0.1)") fails.push("hairline 값 변경");
  if (T.tokenStyle("shadow-soft", INK) !== "box-shadow:0 6px 16px rgba(27, 27, 24, 0.07)") fails.push("soft 그림자 값 변경");
  if (T.tokenStyle("shadow-float", INK) !== "box-shadow:0 12px 28px rgba(27, 27, 24, 0.13)") fails.push("float 그림자 값 변경");
  if (T.tokenStyle("heading-large") !== "font-size:26px;font-weight:800;line-height:1.3;letter-spacing:-0.02em") fails.push("제목 대 값 변경");
  // 4) 기존 코드가 토큰 파일 값을 그대로 읽는다(값 불변 — 렌더 문자열 diff 0은 스냅샷 비교가 증명)
  if (JSON.stringify(PAD_TIERS) !== JSON.stringify(T.PAD_TIERS) || JSON.stringify(RADIUS_TIERS) !== JSON.stringify(T.RADIUS_TIERS) || JSON.stringify(SHADOW_ALPHA_TIERS) !== JSON.stringify(T.SHADOW_ALPHA_TIERS)) fails.push("mood 단계가 토큰과 다름");
  if (HEADING_SECTION_PX !== T.TYPE_V4["heading-large"].size || TYPE_SCALE_V4.title !== T.TYPE_V4["heading-large"] || TYPE_SCALE_V4.card !== T.TYPE_V4["heading-small"]) fails.push("타입 스케일이 토큰과 다름");
  if (depthShadow("soft", INK) !== T.depthShadowOf("soft", INK) || depthShadow("float", INK) !== T.depthShadowOf("float", INK) || hairline(INK) !== T.hairlineOf(INK)) fails.push("palette-v4 깊이가 토큰과 다름");
  if (PERSONA_SINGLE.fontPx !== T.TYPE_V4["heading-mid"].size || PERSONA_SINGLE.weight !== T.TYPE_V4["heading-mid"].w) fails.push("페르소나 단일 라벨이 토큰(중)과 다름(v4 on 기준)");
  // 5) 하드코딩 재발 방지: 토큰으로 옮긴 파일에 옛 리터럴이 다시 생기지 않았는지 소스 확인
  const need: Array<[string, RegExp, string]> = [
    ["lib/mood.ts", /from "@\/lib\/design-tokens-v4"/, "mood.ts가 토큰 파일을 import하지 않음"],
    ["lib/rhythm-tokens.ts", /SPACE_SNAP_BOUNDS/, "rhythm-tokens가 스냅 경계 토큰을 쓰지 않음"],
    ["lib/palette-v4.ts", /depthShadowOf/, "palette-v4가 깊이 토큰을 쓰지 않음"],
    ["lib/dividers.ts", /DIVIDER_ALPHA/, "dividers가 선 농도 토큰을 쓰지 않음"],
    ["lib/design-tokens.ts", /TYPE_V4\["heading-mid"\]/, "페르소나가 제목 중 토큰을 쓰지 않음"],
    ["lib/design-v2.ts", /TYPE_V4\["heading-mid"\]\.w/, "design-v2 포인트 제목 굵기가 토큰을 쓰지 않음"],
  ];
  for (const [f, re, msg] of need) if (!re.test(fs.readFileSync(f, "utf8"))) fails.push(msg);
  const mood = fs.readFileSync("lib/mood.ts", "utf8");
  if (/PAD_TIERS = \[|RADIUS_TIERS = \[|SHADOW_ALPHA_TIERS = \[/.test(mood)) fails.push("mood.ts에 단계 값 하드코딩이 다시 생김");
  if (/function hexToRgbaLocal[\s\S]*depthShadow\(/.test(fs.readFileSync("lib/palette-v4.ts", "utf8"))) fails.push("palette-v4에 깊이 정의가 다시 생김");
  return fails;
}
