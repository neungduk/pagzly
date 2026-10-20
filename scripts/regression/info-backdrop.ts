/**
 * 회귀 — 417차 선행(2-8) 인포 구간 AI 배경 슬롯·상한·폴백·프롬프트. 계산만 검사한다(Replicate·네트워크 호출 0, 유료 0).
 */
import fs from "node:fs";
import path from "node:path";
import {
  INFO_BACKDROP_COST_CAP_USD, INFO_BACKDROP_MAX_COUNT, INFO_BACKDROP_MODELS, INFO_ZONE_PRIORITY,
  buildInfoBackdropPrompt, infoBackdropCostUsd, infoBackdropCss, infoBackdropEligible, infoBackdropMapFrom, infoBackdropSeed,
  infoZonesOfSections, planInfoBackdrops, safeBackdropUrl, type InfoZone,
} from "../../lib/info-backdrop";
import { infoColorsOf, infoCss } from "../../lib/info-style";
import { applyPackTone } from "../../lib/style-packs";
import { HUES } from "../../lib/style-lint";
import { buildThemeFromHueWithNeutral, STUDIO_NEUTRAL_SAMPLE } from "../../lib/color-extract";
import { getCategoryTheme, type CategoryTheme } from "../../lib/category-theme";
import { contrastRatioToken, mixHex } from "../../lib/design-tokens";

export const name = "인포 AI 배경(2-8) — 슬롯 불변·장수·비용 상한·폴백·프롬프트 사전·글자 대비";

const OK_URL = "https://example.supabase.co/storage/v1/object/public/x/info-a.png";
const SUFFIX = "no text, no letters, no logos, no watermark, no people, background plate for text overlay, calm center area";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ALL: InfoZone[] = ["steps", "points", "stat", "compare", "care"];

  // 적용 조건: 패션 + bold/dramatic + 자동 적용 + 스펙 있음
  const base = { category: "의류/패션", info: "bold" as "bold" | "dramatic" | "calm" | undefined, autoEnabled: true, hasSpec: true };
  if (!infoBackdropEligible(base) || !infoBackdropEligible({ ...base, info: "dramatic" })) fails.push("패션 bold/dramatic이 대상이 아님");
  const offs: Array<Partial<typeof base>> = [{ info: "calm" }, { info: undefined }, { category: "뷰티" }, { autoEnabled: false }, { hasSpec: false }];
  for (const off of offs) {
    if (infoBackdropEligible({ ...base, ...off })) fails.push(`대상이 아닌데 통과: ${JSON.stringify(off)}`);
  }

  // 장수·비용 상한: 5구간 → 우선순위 3장, 나머지 폴백, 추정 ≤ 상한
  const plan = planInfoBackdrops(ALL);
  if (plan.items.length !== INFO_BACKDROP_MAX_COUNT) fails.push(`장수 ${plan.items.length} ≠ ${INFO_BACKDROP_MAX_COUNT}`);
  if (plan.items.map((i) => i.zone).join() !== "points,steps,stat") fails.push(`우선순위 선택이 다름: ${plan.items.map((i) => i.zone)}`);
  if (plan.fallbacks.map((f) => `${f.zone}:${f.reason}`).join() !== "compare:count,care:count") fails.push(`폴백이 다름: ${JSON.stringify(plan.fallbacks)}`);
  if (plan.estimateUsd > INFO_BACKDROP_COST_CAP_USD) fails.push(`추정 $${plan.estimateUsd} > 상한`);
  if (plan.items.find((i) => i.zone === "points")?.slug !== "ideogram-ai/ideogram-v3-turbo" || plan.items.find((i) => i.zone === "stat")?.slug !== "black-forest-labs/flux-1.1-pro") fails.push("구간→모델 매칭이 지시서와 다름");
  // 가장 비싼 3장 조합도 상한 이내(상수가 서로 모순되지 않는다 — 올리면 비용 폴백이 항상 발동하지 않는지 여기서 걸린다)
  const worst = Object.values(INFO_BACKDROP_MODELS).map((m) => m.unitUsd).sort((a, b) => b - a).slice(0, INFO_BACKDROP_MAX_COUNT).reduce((s, x) => s + x, 0);
  if (worst > INFO_BACKDROP_COST_CAP_USD) fails.push(`최악 조합 $${worst} > 상한 $${INFO_BACKDROP_COST_CAP_USD}`);
  if (planInfoBackdrops([]).items.length !== 0 || planInfoBackdrops(["care"]).items.length !== 1) fails.push("구간이 적을 때 계획이 다름");
  if (INFO_ZONE_PRIORITY.length !== ALL.length) fails.push("우선순위 목록 누락");

  // 비용 기록: 과금 가능 호출만, 실제 단가(ideogram 0.03·flux-pro 0.04, 417차 잔액 대조)
  if (INFO_BACKDROP_MODELS.A.unitUsd !== 0.03 || INFO_BACKDROP_MODELS.B.unitUsd !== 0.04) fails.push("단가가 417차 실측값이 아님");
  const c1 = infoBackdropCostUsd([
    { zone: "points", kind: "A", billed: true, ok: true },
    { zone: "stat", kind: "B", billed: true, ok: false }, // 생성됐으나 출력 형식 오류 → 폴백, 과금은 됨(416차 flux-schnell)
    { zone: "steps", kind: "A", billed: false, ok: false }, // 429 거절
  ]);
  if (c1 !== 0.07) fails.push(`비용 합산 ${c1} ≠ 0.07`);
  if (infoBackdropCostUsd([]) !== 0) fails.push("빈 결과 비용이 0이 아님");

  // 슬롯 맵: 성공한 구간만, 위험한 주소는 폴백
  const map = infoBackdropMapFrom([
    { zone: "points", ok: true, url: OK_URL },
    { zone: "steps", ok: false, url: OK_URL },
    { zone: "stat", ok: true, url: "http://insecure/x.png" },
    { zone: "compare", ok: true, url: 'https://a/b.png");}body{display:none' },
    { zone: "care", ok: true, url: null },
  ]);
  if (Object.keys(map).join() !== "points") fails.push(`슬롯 맵이 다름: ${JSON.stringify(map)}`);
  const bads: Array<string | null | undefined> = ["javascript:alert(1)", "https://a/b c.png", "https://a/b'.png", "https://a/(x).png", "", null, undefined, "https://a/" + "x".repeat(2000)];
  for (const bad of bads) {
    if (safeBackdropUrl(bad)) fails.push(`안전하지 않은 주소 통과: ${String(bad).slice(0, 30)}`);
  }

  // 프롬프트: 접미 항상, 소재 사전, 니트 아니면 니트 단어 없음, 원문 미포함, 같은 입력=같은 결과
  for (const k of ["A", "B", "C"] as const) {
    const p = buildInfoBackdropPrompt(k, { material: "면 저지", color: "베이지", mood: "따뜻한" });
    if (!p.endsWith(SUFFIX)) fails.push(`${k} 접미 누락`);
  }
  for (const m of ["면 저지", "데님", "린넨 혼방", "알 수 없는 소재 XYZ", null]) {
    const q = buildInfoBackdropPrompt("A", { material: m });
    if (/cable-knit|wool/.test(q)) fails.push(`니트 아닌 소재(${m})에 니트 단어`);
  }
  if (!/cable-knit/.test(buildInfoBackdropPrompt("A", { material: "울 니트" }))) fails.push("니트 소재에 니트 문구 없음");
  if (!/denim/.test(buildInfoBackdropPrompt("A", { material: "데님" })) || !/woven textile/.test(buildInfoBackdropPrompt("A", { material: "알 수 없는 소재" }))) fails.push("소재 사전·일반 폴백 불일치");
  const leak = buildInfoBackdropPrompt("A", { material: "브랜드ZZ 홍길동 모델 면", color: "아무개색", mood: "특별한" });
  if (/브랜드ZZ|홍길동|아무개/.test(leak) || /[가-힣]/.test(leak)) fails.push("입력 원문이 프롬프트에 들어감");
  if (buildInfoBackdropPrompt("B", { material: "면" }) !== buildInfoBackdropPrompt("B", { material: "면" })) fails.push("프롬프트가 결정적이지 않음");
  if (infoBackdropSeed("가디건", "A") !== infoBackdropSeed("가디건", "A") || infoBackdropSeed("가디건", "A") === infoBackdropSeed("가디건", "B")) fails.push("시드 결정성·종류 분리 실패");
  const seed = infoBackdropSeed("가디건", "A");
  if (!(seed > 0 && seed < 2_147_483_647)) fails.push("시드 범위 밖");

  // 슬롯 CSS: 맵 없음·calm = 바이트 불변, 있음 = 해당 구간만, 라이브·export 같은 규칙, 새 CSS 기능 없음
  const theme = applyPackTone({ ...getCategoryTheme("의류/패션"), ...buildThemeFromHueWithNeutral(30, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme, null);
  const colors = infoColorsOf(theme);
  for (const lv of ["bold", "dramatic"] as const) {
    const plain = infoCss(lv, ".pagzly-wrap", colors);
    if (infoCss(lv, ".pagzly-wrap", colors, undefined) !== plain || infoCss(lv, ".pagzly-wrap", colors, {}) !== plain) fails.push(`${lv} 빈 슬롯이 CSS를 바꿈`);
    const withMap = infoCss(lv, ".pagzly-wrap", colors, { points: OK_URL });
    if (!withMap.startsWith(plain) || withMap.length === plain.length) fails.push(`${lv} 슬롯 CSS가 덧붙지 않음`);
    const extra = withMap.slice(plain.length);
    if (!extra.includes('[data-info="points"]') || /data-info="(steps|stat|compare|care)"/.test(extra)) fails.push(`${lv} 슬롯이 다른 구간에도 걸림`);
    const live = infoCss(lv, "[data-pz-pack]", colors, { points: OK_URL, stat: OK_URL });
    const exp = infoCss(lv, ".pagzly-wrap", colors, { points: OK_URL, stat: OK_URL });
    if (live.replace(/\[data-pz-pack\]/g, "S") !== exp.replace(/\.pagzly-wrap/g, "S")) fails.push(`${lv} 슬롯 라이브·export CSS가 스코프 외에 다름`);
    if (/:has\(|@container|text-wrap|@supports|backdrop-filter/.test(exp)) fails.push(`${lv} 슬롯에 새 CSS 기능`);
  }
  if (infoBackdropCss({ points: OK_URL }, "calm", "S", colors) !== "" || infoBackdropCss({ points: OK_URL }, undefined, "S", colors) !== "") fails.push("calm에 슬롯 CSS가 나옴");

  // 글자 대비: 이미지가 최악(어두운 스크림=흰 이미지, 밝은 스크림=검은 이미지)이어도 12 hue × 2 모드에서 4.5:1 이상
  const fullMap = Object.fromEntries(ALL.map((z) => [z, OK_URL]));
  for (const lv of ["bold", "dramatic"] as const) {
    for (const h of HUES) {
      const t = applyPackTone({ ...getCategoryTheme("의류/패션"), ...buildThemeFromHueWithNeutral(h, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme, null);
      const c = infoColorsOf(t);
      const css = infoBackdropCss(fullMap, lv, "S", c);
      if (!css) fails.push(`${lv} hue${h} 슬롯 CSS 없음`);
      for (const m of css.matchAll(/data-info="(\w+)"\]\{background:linear-gradient\(rgba\((\d+),(\d+),(\d+),([\d.]+)\)/g)) {
        const zone = m[1]!;
        const hex = "#" + [m[2], m[3], m[4]].map((x) => Number(x).toString(16).padStart(2, "0")).join("");
        const a = Number(m[5]);
        const dark = zone === "points" || (zone === "stat" && lv === "dramatic");
        const eff = mixHex(dark ? "#FFFFFF" : "#000000", hex, a);
        const cr = contrastRatioToken(dark ? c.paper : c.ink, eff);
        if (cr < 4.5) fails.push(`${lv} hue${h} ${zone} 최악 이미지 대비 ${cr.toFixed(2)} < 4.5`);
      }
    }
  }

  // 렌더러 연결: 라이브·export 모두 같은 맵을 infoCss에 넘기고, 모델 슬러그가 다른 곳에 흩어지지 않는다
  const root = path.join(__dirname, "..", "..");
  const live = fs.readFileSync(path.join(root, "components", "DetailSectionRenderer.tsx"), "utf8");
  const exp = fs.readFileSync(path.join(root, "lib", "export-detail-html.ts"), "utf8");
  if (!/infoColorsOf\(baseTheme\), infoBackdrops\)/.test(live)) fails.push("라이브가 infoBackdrops를 infoCss에 넘기지 않음");
  if (!/infoColorsOf\(opts\.theme\), opts\.infoBackdrops\)/.test(exp)) fails.push("export가 infoBackdrops를 infoCss에 넘기지 않음");
  for (const slug of ["ideogram-v3-turbo", "flux-1.1-pro"]) {
    for (const f of ["components/DetailSectionRenderer.tsx", "lib/export-detail-html.ts", "lib/info-style.ts", "app/api/generate/route.ts", "lib/photo-pipeline-client.ts"]) {
      if (fs.readFileSync(path.join(root, f), "utf8").includes(slug)) fails.push(`${f}에 모델 슬러그(${slug})가 있음 — info-backdrop.ts에만 둔다`);
    }
  }
  // 417차: 섹션 → 인포 구간, 결과 화면·export·초안 화면 연결
  const z = infoZonesOfSections([
    { type: "hero" }, { type: "highlight_box", slot: "seller_trust_evidence" }, { type: "highlight_box" }, { type: "usage_steps" },
    { type: "comparison_chart", presentationStyle: "bar" }, { type: "comparison_chart", presentationStyle: "checklist" }, { type: "caution" }, { type: "stat_infographic" },
  ]).join();
  if (z !== "points,steps,stat,compare,care") fails.push(`섹션→구간 추출이 다름: ${z}`);
  if (infoZonesOfSections([{ type: "hero" }, { type: "highlight_box", slot: "seller_trust_evidence" }, { type: "comparison_chart", presentationStyle: "bar" }]).length !== 0) fails.push("인포가 아닌 섹션이 구간으로 잡힘");
  const result = fs.readFileSync(path.join(root, "app", "create", "result", "page.tsx"), "utf8");
  if (!/infoBackdrops={data.infoBackdrops}/.test(result) || !/infoBackdrops: data.infoBackdrops,/.test(result)) fails.push("결과 화면이 라이브·export에 같은 infoBackdrops를 넘기지 않음");
  const draft = fs.readFileSync(path.join(root, "app", "create", "draft", "page.tsx"), "utf8");
  if (!/snap.category === FASHION && STYLE_AUTO_ENABLED/.test(draft) || !/infoBackdrops: photo.infoBackdrops/.test(draft)) fails.push("초안 화면 연결(패션·자동 적용 한정, 세션 저장)이 없음");
  return fails;
}
