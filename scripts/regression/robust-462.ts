/**
 * 회귀 — 462차 견고성 수정(R1 페르소나 4줄·R2 비교 막대 긴 단위·R3 통계 막대 긴 값)과 UP1 변형(하이라이트 카드 4장 2×2).
 * 브라우저·네트워크 없이 export 문자열 렌더와 소스 문자열만 본다. UP1은 모듈 로드 때 읽히는 플래그라 이 프로세스(꺼짐)에서는 꺼진 쪽 출력만 렌더로 확인하고,
 * 켜짐 쪽은 순수 함수 인자(up1)와 소스 문자열로 확인한다.
 */
import fs from "node:fs";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { DESIGN_V4_ENABLED, DESIGN_V4_UP1_ENABLED } from "../../lib/design-v4";
import { LONG_STAT_VALUE_CHARS, LONG_UNIT_CHARS, PERSONA_LONG_CHARS, isLongStatValue, isLongUnit, personaClampLines } from "../../lib/robust-462";
import { exportArgsOf, readSession } from "../design-corpus";

export const name = "견고성 수정 462 — 긴 단위/값 줄바꿈 허용·정상 값 불변·페르소나 4줄(UP1)·하이라이트 2×2(UP1)·꺼짐=이전 출력";

type Sec = Record<string, unknown> & { type: string };
const FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image"];

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };

  // 순수 함수
  ok(personaClampLines("가".repeat(PERSONA_LONG_CHARS + 1), true) === 4, "UP1 켜짐: 긴 문장이 4줄이 아님");
  ok(personaClampLines("가".repeat(PERSONA_LONG_CHARS), true) === 3, "UP1 켜짐: 경계 길이가 3줄이 아님");
  ok(personaClampLines("가".repeat(40), false) === 3, "UP1 꺼짐인데 4줄");
  ok(!isLongUnit("%") && !isLongUnit("개월") && !isLongUnit("가".repeat(LONG_UNIT_CHARS)) && isLongUnit("가".repeat(LONG_UNIT_CHARS + 1)), "isLongUnit 경계");
  ok(!isLongStatValue("98.5%") && !isLongStatValue("1".repeat(LONG_STAT_VALUE_CHARS)) && isLongStatValue("1".repeat(LONG_STAT_VALUE_CHARS + 1)) && !isLongStatValue(undefined as unknown as string), "isLongStatValue 경계");

  // 기본값: UP1은 꺼짐
  ok(process.env.NEXT_PUBLIC_DESIGN_V4_UP1 === undefined || process.env.NEXT_PUBLIC_DESIGN_V4_UP1 !== "on" || DESIGN_V4_UP1_ENABLED, "UP1 플래그 판정 불일치");
  const flag = fs.readFileSync("lib/design-v4.ts", "utf8");
  ok(/DESIGN_V4_UP1_ENABLED = DESIGN_V4_ENABLED && process\.env\.NEXT_PUBLIC_DESIGN_V4_UP1 === "on"/.test(flag), "UP1은 v4 안에서 'on'일 때만 켜져야 함");

  // export 렌더(v4 켜짐·UP1 꺼짐 프로세스 가정)
  if (!DESIGN_V4_ENABLED || DESIGN_V4_UP1_ENABLED) {
    f.push("이 회귀는 v4 켜짐·UP1 꺼짐 프로세스를 가정함(환경이 다름)");
    return f;
  }
  const a = exportArgsOf(readSession("scripts/fixtures/archetype-compare-beauty.json"));
  const sections = a.sections as unknown as Sec[];
  // 섹션 하나만 담으면 표시 예산이 비교표·통계를 빼므로, 전체 목록에서 한 섹션만 바꿔 렌더한다
  const swap = (from: Sec, to: Sec): string => buildDetailPageHtml({ ...a, claimFacts: undefined, sections: sections.map((x) => (x === from ? to : x)) as never }) // claimFacts 없음 = 비교 정책이 차트를 빼지 않음;
  const bar = sections.find((s) => s.type === "comparison_chart" && s.presentationStyle !== "checklist");
  if (bar) {
    // 막대형은 측정 근거(basis=measured)일 때만 그려지고 아니면 체크리스트로 바뀐다
    const measured = { ...bar, basis: "measured" } as Sec;
    const normal = swap(bar, measured);
    const long = swap(bar, { ...measured, unit: "개월 사용 기준" });
    ok(normal === swap(bar, measured), "같은 입력인데 결과가 다름(결정성)");
    ok(/flex-shrink:0;white-space:nowrap;font-variant-numeric:tabular-nums/.test(normal), "정상 단위: 값 칸 nowrap이 사라짐(출력 변경)");
    ok(!/max-width:60%;text-align:right/.test(normal), "정상 단위인데 줄바꿈 허용 스타일이 들어감");
    ok(/min-width:0;max-width:60%;text-align:right;font-variant-numeric:tabular-nums/.test(long), "긴 단위: 값 칸이 줄바꿈을 허용하지 않음");
    ok(/개월 사용 기준/.test(long), "긴 단위 문구가 사라짐(내용 보존)");
  } else f.push("비교 막대 픽스처 없음");

  const stat = sections.find((s) => s.type === "stat_infographic" && Array.isArray(s.metrics) && (s.metrics as unknown[]).length > 0);
  if (stat) {
    // 막대(목록)형으로 바꾼 지표 하나에 긴 값을 넣는다(막대형은 number·ring이 아닌 style)
    const ms = stat.metrics as Array<Record<string, unknown>>;
    const metrics = ms.map((m, i) => (i === 0 ? { ...m, style: "bar", percent: 60, value: "6개월 이상 꾸준히 사용 시" } : m));
    const long = swap(stat, { ...stat, metrics });
    ok(/min-width:0;max-width:60%;text-align:right;font-size:16px;line-height:1.5/.test(long), "긴 값: 통계 막대 값 칸이 줄바꿈을 허용하지 않음");
    ok(/6개월 이상 꾸준히 사용 시/.test(long), "긴 값 문구가 사라짐");
    const shortMetrics = ms.map((m, i) => (i === 0 ? { ...m, style: "bar", percent: 60, value: "60%" } : m));
    const normal = swap(stat, { ...stat, metrics: shortMetrics });
    ok(!/max-width:60%;text-align:right;font-size:16px/.test(normal), "정상 값인데 줄바꿈 허용 스타일이 들어감");
    ok(/flex-shrink:0;white-space:nowrap;font-size:16px;line-height:1\.5/.test(normal), "정상 값: 값 칸 nowrap이 사라짐(출력 변경)");
  } else f.push("통계 막대 픽스처 없음");

  // 하이라이트 4장: UP1 꺼짐 = 넓은 폭 4열(이전 출력), 소스에는 UP1 분기가 있음
  let hlDone = false;
  for (const file of fs.readdirSync("scripts/fixtures").filter((n) => n.startsWith("archetype-") && n.endsWith(".json")).sort()) {
    const ha = exportArgsOf(readSession(`scripts/fixtures/${file}`));
    const hsecs = ha.sections as unknown as Sec[];
    const hl = hsecs.find((s) => s.type === "highlight_box" && s.slot !== "seller_trust_evidence" && Array.isArray(s.cards) && (s.cards as unknown[]).length > 0);
    if (!hl) continue;
    const base = (hl.cards as Array<Record<string, unknown>>)[0]!;
    const mk = () => buildDetailPageHtml({ ...ha, claimFacts: undefined, sections: hsecs.map((x) => (x === hl ? { ...hl, cards: [base, base, base, base] } : x)) as never });
    const four = mk();
    // 카드 4장이 격자 분기로 그려지면 넓은 폭 열 수는 4(이전 출력) — 아이콘 목록 분기로 가면 이 변수가 없다
    if (!/--pz-hl-wide:repeat\(4,1fr\)/.test(four)) continue;
    hlDone = true;
    ok(four === mk(), "하이라이트 결정성");
    ok(!/--pz-hl-wide:repeat\(2,1fr\)/.test(four), "UP1 꺼짐인데 2열 변수");
    break;
  }
  ok(hlDone, "하이라이트 4장 격자 분기를 렌더하는 픽스처가 없음");
  const exp = fs.readFileSync("lib/export-detail-html.ts", "utf8");
  const live = fs.readFileSync("components/DetailSectionRenderer.tsx", "utf8");
  ok(/DESIGN_V4_UP1_ENABLED && cards\.length === 4 \? 2 : cards\.length/.test(exp), "export UP1 하이라이트 분기 없음");
  ok(/DESIGN_V4_UP1_ENABLED\s*\n?\s*\? "max-w-5xl grid-cols-2"/.test(live) && /: "max-w-5xl grid-cols-2 @min-\[640px\]\/pz:grid-cols-4"/.test(live), "라이브 UP1 하이라이트 분기(패리티) 없음");
  ok(/personaClampLines\(p\)/.test(exp) && /personaClampLines\(persona\)/.test(live), "페르소나 4줄이 라이브·export 양쪽에 없음");
  ok(/isLongUnit\(unit\)/.test(exp) && /isLongUnit\(unit\)/.test(live), "긴 단위 처리가 라이브·export 양쪽에 없음");
  ok(/isLongStatValue\(m\.value\)/.test(exp) && /isLongStatValue\(metric\.value\)/.test(live), "긴 값 처리가 라이브·export 양쪽에 없음");
  // 정상 클래스 문자열 보존(라이브)
  ok(/"line-clamp-4" : "line-clamp-3"\} min-w-0 flex-1 text-center\$\{DESIGN_V4_ENABLED \? "" : " font-medium"\}/.test(live), "라이브 페르소나 클래스 정상 형태가 바뀜");

  // 새 코드에 금지 CSS 없음
  const mine = fs.readFileSync("lib/robust-462.ts", "utf8");
  for (const k of FORBIDDEN) if (mine.includes(k)) f.push(`robust-462.ts에 금지 CSS ${k}`);
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
