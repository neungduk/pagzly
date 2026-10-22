/**
 * 회귀 — 431차 1-2 일러스트 라이브러리·매핑: 15종 모두 3스타일×3변형 SVG 생성, 결정적(같은 입력 같은 문자열), 변형이 색 슬롯을 실제로 돌림,
 * 금지 요소(foreignObject·filter·외부 참조·script) 없음, 장식은 aria-hidden, 키워드 매핑(없으면 null·제외 목록 존중), 스타일 선택. 호출 0.
 */
import { ILLUST_IDS, illustrationSvg } from "../../lib/illustrations/library";
import { ILLUST_STYLES } from "../../lib/illustrations/core";
import { ILLUSTRATION_RULE_IDS, illustStyleFor, pickIllustration } from "../../lib/illustration-map";

export const name = "일러스트 라이브러리·매핑 — 15종×스타일3×변형3·결정적·금지 요소 없음·색 슬롯 회전·키워드 매핑·스타일 선택";

const PAL = { a: "#2F7A6B", b: "#1F4E5F", c: "#BFE3D8", n: "#F4EFE6" };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  if (ILLUST_IDS.length < 12) fails.push(`일러스트 ${ILLUST_IDS.length}종(최소 12종)`);
  eq("매핑 규칙이 라이브러리 전부를 가리킴", [...ILLUSTRATION_RULE_IDS].sort(), [...ILLUST_IDS].sort());
  for (const id of ILLUST_IDS) {
    const seen = new Set<string>();
    for (const st of ILLUST_STYLES) {
      for (const v of [0, 1, 2]) {
        const svg = illustrationSvg(id, st, PAL, v, "k");
        if (svg !== illustrationSvg(id, st, PAL, v, "k")) fails.push(`${id}/${st}/v${v}: 비결정적`);
        if (!svg.startsWith("<svg ") || !svg.endsWith("</svg>") || !svg.includes('viewBox="0 0 200 200"')) fails.push(`${id}: svg 형식`);
        if (/<foreignObject|<filter|<script|<image|xlink:href|href=|url\((?!#)/i.test(svg)) fails.push(`${id}/${st}/v${v}: 금지 요소(외부 참조·filter 등)`);
        if (!svg.includes('aria-hidden="true"')) fails.push(`${id}: 장식인데 aria-hidden 없음`);
        if (svg.length > 6000) fails.push(`${id}/${st}/v${v}: SVG ${svg.length}자(6KB 초과)`);
        seen.add(`${st}|${svg}`);
      }
    }
    eq(`${id}: 9개 조합이 모두 다름`, seen.size, 9);
  }
  // 색 슬롯 회전: 변형 0과 1은 주 색이 다르다
  const main = (v: number) => /<circle cx="100" cy="100" r="52" fill="(#[0-9A-F]{6})"/.exec(illustrationSvg("check", "flat", PAL, v, "k"))?.[1];
  eq("변형 0·1·2 주 색이 슬롯을 돌림", [main(0), main(1), main(2)], [PAL.a, PAL.b, PAL.c]);
  // 스타일별 특징: solid=그라데이션, flat=그라데이션 없음, line=선
  if (!/linearGradient/.test(illustrationSvg("drop", "solid", PAL, 0))) fails.push("solid에 그라데이션 없음");
  if (/linearGradient/.test(illustrationSvg("drop", "flat", PAL, 0))) fails.push("flat에 그라데이션");
  if (!/stroke-width="3"/.test(illustrationSvg("drop", "line", PAL, 0))) fails.push("line에 외곽선 없음");
  // 매핑
  eq("수분", pickIllustration("수분을 들고 다니는 이유")?.id, "drop");
  eq("사이즈", pickIllustration("사이즈 가이드: 총장 60cm")?.id, "tape");
  eq("소재", pickIllustration("울 30% 혼방 니트 소재")?.id, "weave");
  eq("세탁", pickIllustration("손세탁 후 그늘에서 건조")?.id, "wave");
  eq("키워드 없음 → null", pickIllustration("자연스럽게 어울리는 선택입니다"), null);
  eq("제외 목록 존중", pickIllustration("수분 보호", new Set(["drop"]))?.id, "shield");
  // 스타일 선택
  eq("스타일 선택", [illustStyleFor("화장품/뷰티"), illustStyleFor("의류/패션"), illustStyleFor("전자제품"), illustStyleFor(undefined)], ["line", "flat", "solid", "solid"]);
  return fails;
}
