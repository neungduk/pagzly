/**
 * 477차 D — 도식형 스펙: 윤곽 5종·치수 매칭·폴백·스프라이트 use.
 */
import { buildSpecDiagramV5, matchDimRows, outlineOfCategory } from "../../lib/spec-diagram-v5";
import { svgSpriteV5, useOutline } from "../../lib/svg-sprite-v5";

export const name = "스펙도식 477 — 윤곽·치수·폴백";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const kinds = ["garment", "bag", "bottle", "box", "appliance"] as const;
  for (const k of kinds) {
    if (!useOutline(k).includes(`pzO-${k}`)) f.push(`useOutline(${k}) id 누락`);
  }
  // 윤곽은 전역 스프라이트가 아니라 도식 로컬 defs(미사용 페이지 export 방지)
  void svgSpriteV5;
  for (const k of kinds) {
    const html = buildSpecDiagramV5(
      k === "garment" ? "의류/패션" : k === "bag" ? "가방" : k === "bottle" ? "화장품/뷰티" : k === "appliance" ? "가전" : "리빙",
      [
        { label: "총장", value: "90cm" },
        { label: "폭", value: "40cm" },
      ],
      "#111",
    );
    if (!html?.includes(`id="pzO-${k}"`) || !html.includes(`href="#pzO-${k}"`)) f.push(`도식 로컬 defs/use(${k}) 누락`);
  }

  if (outlineOfCategory("의류/패션") !== "garment") f.push("패션→garment");
  if (outlineOfCategory("가방") !== "bag") f.push("가방→bag");
  if (outlineOfCategory("화장품/뷰티") !== "bottle") f.push("뷰티→bottle");
  if (outlineOfCategory("가전/디지털") !== "appliance") f.push("가전→appliance");
  if (outlineOfCategory("리빙") !== "box") f.push("리빙→box");

  const dims = matchDimRows([
    { label: "총장", value: "90cm" },
    { label: "어깨너비", value: "42cm" },
    { label: "무게", value: "180g" },
  ]);
  if (dims.length < 2) f.push(`치수 매칭 ${dims.length} < 2`);

  const ok = buildSpecDiagramV5("의류/패션", [
    { label: "총장", value: "90cm" },
    { label: "어깨너비", value: "42cm" },
  ], "#111");
  if (!ok || !ok.includes("data-pz-specdiag") || !ok.includes("90cm")) f.push("도식 HTML 생성 실패");

  const fallback = buildSpecDiagramV5("리빙", [{ label: "재질", value: "면" }], "#111");
  if (fallback !== null) f.push("치수 부족 시 폴백(null)이어야 함");

  // 숫자는 입력값만 — 하드코딩 cm 숫자 금지 검사(입력 90cm만)
  if (ok && /56cm|우산/.test(ok)) f.push("입력에 없는 수치/카피 혼입");

  return f;
}

if (require.main === module) {
  run().then((fails) => {
    console.log(fails.length ? fails.join("\n") : "ok");
    process.exit(fails.length ? 1 : 0);
  });
}
