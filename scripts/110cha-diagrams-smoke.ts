/**
 * 110차 — 설명형 다이어그램 스모크
 * 실행: npx tsx scripts/110cha-diagrams-smoke.ts
 */
import assert from "node:assert/strict";
import {
  buildVolumeComparisonDiagramSvg,
  buildVolumeComparisonEntries,
  filterVolumeLabelsForCompliance,
  matchProductVolumeMl,
  parseVolumeMl,
} from "../lib/volume-comparison-diagram";
import {
  buildUsageOrderFlowSvg,
  prepareUsageFlowSteps,
} from "../lib/usage-order-diagram";

function run() {
  // --- Volume: (a) 입력 충분 ---
  assert.equal(parseVolumeMl("35mL"), 35);
  assert.equal(parseVolumeMl("100 ml"), 100);
  const ml = matchProductVolumeMl([{ label: "용량", value: "35mL" }]);
  assert.equal(ml, 35);
  const entries = buildVolumeComparisonEntries(ml);
  assert.ok(entries && entries.length === 2);
  const svg = buildVolumeComparisonDiagramSvg(entries!, "#334", "#334");
  assert.match(svg, /data-diagram="volume-comparison"/);
  assert.match(svg, /<svg /);
  assert.doesNotMatch(svg, /src=["']https?:\/\//); // 외부 이미지 URL 없음
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);

  // --- Volume: (b) 일부 누락 / (c) 없음 → 미렌더 ---
  assert.equal(matchProductVolumeMl([{ label: "용량", value: "판매자 확인 필요" }]), null);
  assert.equal(matchProductVolumeMl([{ label: "성분", value: "물" }]), null);
  assert.equal(buildVolumeComparisonEntries(null), null);
  assert.equal(buildVolumeComparisonDiagramSvg([], "#000", "#000"), "");

  // --- Compliance: 효능 라벨 필터 ---
  const dirty = filterVolumeLabelsForCompliance([
    { label: "이 제품 35mL", ml: 35, isProduct: true },
    { label: "24시간 보습 100mL", ml: 100, isProduct: false },
  ]);
  assert.equal(dirty, null); // 하나 탈락 → 2개 미만

  const ok = filterVolumeLabelsForCompliance([
    { label: "이 제품 35mL", ml: 35, isProduct: true },
    { label: "일반 100mL", ml: 100, isProduct: false },
  ]);
  assert.ok(ok && ok.length === 2);

  // --- Usage flow: (a) 충분 ---
  const steps = prepareUsageFlowSteps([
    "토너로 피부 정돈",
    "미스트 2~3회 분사",
    "가볍게 눌러 흡수",
  ]);
  assert.ok(steps && steps.length === 3);
  const flow = buildUsageOrderFlowSvg(steps!, "#445", "#111");
  assert.match(flow, /data-diagram="usage-order-flow"/);
  assert.match(flow, /<svg /);
  assert.doesNotMatch(flow, /src=["']https?:\/\//);

  // --- Usage: (b) 1개만 / (c) 없음 ---
  assert.equal(prepareUsageFlowSteps(["하나만"]), null);
  assert.equal(prepareUsageFlowSteps([]), null);
  assert.equal(buildUsageOrderFlowSvg(["하나"], "#000", "#000"), "");

  // --- Usage compliance ---
  assert.equal(
    prepareUsageFlowSteps(["피부 장벽 강화", "미백 효과 극대화"]),
    null,
  );

  console.log("110cha-diagrams-smoke PASS");
}

run();
