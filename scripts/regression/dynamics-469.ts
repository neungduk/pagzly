/**
 * 회귀 — 469차 "남은 평평한 덩어리". 브라우저·네트워크 없음(문자열 렌더만). Phase마다 같은 파일에 검사를 더한다.
 *  Phase 2: 일반 섹션 구조 재작성(target_persona→concern 변형·step_card→zigzag·상품 정보 목록 CSS): 원문 보존·조건·폴백·대상 한정
 *  Phase 4: 화면 장악 장면(승격 계획: 개수·간격·위치 제한, 큰 글자 36px 이상·min-height 640, 새 글자 없음, 소스 가드)
 *  Phase 3: 본문 글자 토큰(≥15px, 행간 ≤ typo-v4 상한, 가격·한 줄 고정·대문자 라벨·짧은 글 제외, 고지/배송 블록 불변)
 *  Phase 1: 정보 구간(data-info) 아키타입화 — 토큰·덮어쓰기 CSS·팔레트 전수 대비·진한 정보 구간 0·V5 꺼짐 미호출
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPES, ARCHETYPE_IDS, FIT_AVAIL_PX, setV5ArchetypeForTests, typographyV5 } from "../../lib/page-archetype-v5";
import { infoCssV5, specListCssV5 } from "../../lib/info-v5";
import { infoColorsOf } from "../../lib/info-style";
import { scrimAlpha } from "../../lib/info-backdrop";
import { getCategoryTheme } from "../../lib/category-theme";
import { contrastRatioToken, mixHex } from "../../lib/design-tokens";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { bodyMedian, darkInfoZones } from "../dynamics-metrics-469";
import { SCENE_COUNT, SCENE_MIN_PX, sceneTextFits } from "../../lib/layout-variants";
import { EYEBROW_LABEL } from "../../lib/type-treatments";
import { readableTexts } from "../dynamics-metrics-468";
import { topSections } from "../variety-metrics-463";
import { expandDedupedStyles } from "../../lib/style-dedupe";
import { BODY_LINE_HEIGHT_MAX } from "../../lib/typo-v4";

export const name = "다이나믹 469 — 정보 구간 아키타입화·(이후 Phase: 일반 섹션 구조·본문 글자·장면)";

const FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image", "filter:", "backdrop-filter", "position:fixed", "animation"];

export async function run(): Promise<string[]> {
  const f: string[] = [];
  // ── Phase 1: 토큰·소스 잠금
  for (const a of ARCHETYPE_IDS) {
    const t = ARCHETYPES[a];
    const dark = t.face === "blockAlt" || t.face === "colorCollide";
    if (dark !== (t.infoBackdrop === "scrim-deep")) f.push(`${a}: infoBackdrop ${t.infoBackdrop} (진한 성격만 scrim-deep)`);
  }
  for (const p of ["lib/export-detail-html.ts", "components/DetailSectionRenderer.tsx"]) {
    const s = fs.readFileSync(p, "utf8");
    if (!/\(display(?:Res)?\.v5 \? archetypeCssV5\([^)]*\) \+ infoCssV5\(/.test(s)) f.push(`${p}: infoCssV5가 V5 토큰(편집 모드면 null) 뒤에서만 나가지 않음`);
  }
  // ── 팔레트 전수(카테고리 테마 6 + 말뭉치 테마): 글자 대비 4.5:1
  const themes = ["화장품/뷰티", "패션/의류", "식품", "전자/가전", "생활/리빙", "반려동물"].map((c) => getCategoryTheme(c));
  for (const [, file] of corpus()) themes.push(exportArgsOf(readSession(file)).theme);
  for (const [i, th] of themes.entries()) {
    const c = infoColorsOf(th);
    const tint = mixHex("#FFFFFF", c.soft, 0.55);
    const a = scrimAlpha(tint, c.ink, "#000000", 5.5);
    const worst = contrastRatioToken(c.ink, mixHex("#000000", tint, Math.min(0.96, Math.max(0.72, a))));
    if (worst < 4.5) f.push(`테마#${i}: 밝은 스크림 최악(검은 사진) 잉크 대비 ${worst.toFixed(2)} < 4.5`);
    if (contrastRatioToken(c.deep, "#FFFFFF") < 4.5) f.push(`테마#${i}: 카드 위 진한 색 글자 대비 < 4.5`);
    if (contrastRatioToken("#FFFFFF", c.deep) < 4.5) f.push(`테마#${i}: 강조 카드(흰 글자/진한 면) 대비 < 4.5`);
    if (contrastRatioToken(c.ink, "#FFFFFF") < 4.5) f.push(`테마#${i}: 카드 위 잉크 대비 < 4.5`);
    if (contrastRatioToken(c.deep, c.base) < 4.5 && contrastRatioToken(c.deep, "#FFFFFF") >= 4.5) { /* statnum: 진한 글자/기본 면 — 아래에서 별도 확인 */ }
    for (const a2 of ARCHETYPE_IDS) {
      const css = infoCssV5(".w", ARCHETYPES[a2], c, { points: "https://example.invalid/x.png" });
      if (ARCHETYPES[a2].infoBackdrop === "scrim-deep" && css !== specListCssV5(".w", ARCHETYPES[a2], c)) f.push(`${a2}: scrim-deep인데 정보 구간 덮어쓰기 CSS가 나감`);
      for (const k of FORBIDDEN) if (css.includes(k)) f.push(`${a2}: 금지 CSS ${k}`);
      if (/url\("(?!https:)/.test(css)) f.push(`${a2}: https 아닌 url`);
      if (ARCHETYPES[a2].infoBackdrop !== "scrim-deep" && !/\[data-info="points"\]\{background:linear-gradient/.test(css)) f.push(`${a2}: 사진이 있는데 스크림 배경 규칙 없음`);
      const none = infoCssV5(".w", ARCHETYPES[a2], c, undefined);
      if (ARCHETYPES[a2].infoBackdrop !== "scrim-deep" && /url\(/.test(none)) f.push(`${a2}: 사진이 없는데 url`);
    }
  }
  // statnum: 잉크 글자가 기본 면·소프트 면 위에서 읽히는지(stat 소프트 면 포함)
  for (const [i, th] of themes.entries()) { const c = infoColorsOf(th); for (const [n, bg] of [["기본", c.base], ["소프트", c.soft]] as const) if (contrastRatioToken(c.ink, bg) < 4.5) f.push(`테마#${i}: 잉크/${n} 면 대비 ${contrastRatioToken(c.ink, bg).toFixed(2)} < 4.5`); }
  // ── Phase 2: 일반 섹션 구조 재작성
  {
    const th = infoColorsOf(getCategoryTheme("화장품/뷰티"));
    for (const a of ARCHETYPE_IDS) {
      const css = specListCssV5(".w", ARCHETYPES[a], th);
      if (!css.includes(".w #pagzly-info")) f.push(`${a}: 상품 정보 선택자 없음`);
      if (/pagzly-size|pagzly-shipping|data-info/.test(css)) f.push(`${a}: 크기표/배송/정보 구간 선택자가 섞임`);
      for (const k of FORBIDDEN) if (css.includes(k)) f.push(`${a}: 금지 CSS ${k}`);
      for (const m of css.matchAll(/font-size:(\d+)px/g)) if (Number(m[1]) < 12) f.push(`${a}: 상품 정보 글자 ${m[1]}px < 12`);
      const ledger = ["editorial", "luxe", "techsheet"].includes(a);
      if (ledger !== /display:flex/.test(css)) f.push(`${a}: ledger/stack 구조 매핑이 다름`);
      if (!/#pagzly-info td\{[^}]*font-size:1[67]px/.test(css)) f.push(`${a}: 상품 정보 값 글자 16px 이상 아님`);
    }
    setDesignUp1ForTests(true);
    setDesignV5ForTests(true);
    setV5ArchetypeForTests("editorial");
    for (const [id, file] of corpus()) {
      const args = exportArgsOf(readSession(file));
      setDesignV5ForTests(false);
      const base = exportHtmlOf(file);
      setDesignV5ForTests(true);
      const h = exportHtmlOf(file);
      const plain = (x: string): string => x.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ");
      const hp = plain(h); const bp = plain(base);
      // 문장 보존: 기준(V5 꺼짐, 표시 예산이 섹션을 지웠을 수도 있다)에 화면에 있던 문장은 V5에서도 그대로 있어야 한다
      for (const sec of args.sections) {
        if (sec.type === "target_persona") for (const ptxt of sec.personas) if (bp.includes(ptxt.trim()) && !hp.includes(ptxt.trim())) f.push(`${id}: 추천 대상 문장 사라짐 «${ptxt.slice(0, 14)}»`);
        if (sec.type === "step_card") for (const st of sec.steps) if (bp.includes(st.title.trim()) && !hp.includes(st.title.trim())) f.push(`${id}: 단계 제목 사라짐 «${st.title.slice(0, 12)}»`);
        if (sec.type === "step_card") for (const st of sec.steps) if (st.body.trim() && bp.includes(st.body.trim()) && !hp.includes(st.body.trim())) f.push(`${id}: 단계 본문 사라짐 «${st.body.slice(0, 12)}»`);
      }
    }
    // 조건 미달 폴백: 2개·7개 추천 대상, 41자 문장은 변환하지 않는다(원 렌더러 유지) — 소스 조건 잠금
    const lv = fs.readFileSync("lib/layout-variants.ts", "utf8");
    if (!/ps\.length >= 3 && ps\.length <= 6/.test(lv) || !/len\(t\) <= 40/.test(lv) || !/personaStripIndexes\(s, ctx\.imageUrls\.length\) === null/.test(lv)) f.push("추천 대상 변환 조건(3~6개·40자·사진 띠 없음)이 소스에 없음");
    if (!/only: \["zigzag"\], label: "STEP"/.test(lv)) f.push("step_card 변환이 사진 보존 변형(zigzag)·STEP 라벨로 한정되지 않음");
    if (!/designV5On\(\) && s\.type === "target_persona"/.test(lv) || !/designV5On\(\) && s\.type === "step_card"/.test(lv)) f.push("일반 섹션 변환이 designV5On() 가드 뒤가 아님");
    setV5ArchetypeForTests(null);
    setDesignV5ForTests(false);
  }
  // ── Phase 4: 화면 장악 장면
  {
    if (SCENE_MIN_PX < 36) f.push("장면 최소 글자 < 36");
    if (!sceneTextFits("짧은 문장입니다 이것은 한 화면") ) f.push("짧은 문장이 장면 요건을 못 채움");
    if (sceneTextFits("가".repeat(200)) || sceneTextFits("")) f.push("너무 긴 문장/빈 문장이 장면 요건을 채움");
    const lv = fs.readFileSync("lib/layout-variants.ts", "utf8");
    if (!/const withMotifs = ctx\.v5 \? planScenesV5\(withMotifs1, ctx\) : withMotifs1;/.test(lv)) f.push("planScenesV5가 V5 토큰(ctx.v5) 뒤에서만 호출되지 않음");
    const labels = new Set(Object.values(EYEBROW_LABEL));
    setDesignUp1ForTests(true);
    for (const a of ARCHETYPE_IDS) {
      setV5ArchetypeForTests(a);
      const want = SCENE_COUNT[ARCHETYPES[a].dyn.level];
      for (const [id, file] of corpus()) {
        setDesignV5ForTests(false);
        const base = exportHtmlOf(file);
        setDesignV5ForTests(true);
        const h = exportHtmlOf(file);
        const secs = topSections(expandDedupedStyles(h));
        const idx = secs.map((x, i) => (/data-pz-v4="\w+\.scene"/.test(x.slice(0, 400)) ? i : -1)).filter((i) => i >= 0);
        if (idx.length > want) f.push(`${id}/${a}: 장면 ${idx.length}개 > ${want}`);
        for (let k = 1; k < idx.length; k += 1) if (idx[k]! - idx[k - 1]! < 3) f.push(`${id}/${a}: 장면 사이 조용한 블록 2개 미만(${idx[k - 1]},${idx[k]})`);
        for (const i of idx) {
          const x = secs[i]!;
          if (i < 1) f.push(`${id}/${a}: 장면이 맨 앞`);
          if (i >= secs.length - 1) f.push(`${id}/${a}: 장면이 마지막 섹션`);
          const mh = Math.max(0, ...[...x.matchAll(/min-height:\s*(\d+)px/g)].map((m) => Number(m[1])));
          if (mh < 640) f.push(`${id}/${a}: 장면 min-height ${mh} < 640`);
          const big = Math.max(0, ...readableTexts(x).map((t) => t.size).filter((s2) => s2 < 140));
          if (big < SCENE_MIN_PX) f.push(`${id}/${a}: 장면 큰 글자 ${big}px < ${SCENE_MIN_PX}`);
          if (/data-pz-dyn-deco(?![^>]*data-pz-seam)/.test(x)) f.push(`${id}/${a}: 장면에 다이나믹 장식이 얹힘`);
          for (const nb of [secs[i - 1], secs[i + 1]]) if (nb && /data-pz-v4="(touch|breather)\./.test(nb.slice(0, 400))) f.push(`${id}/${a}: 장면이 접점/숨 고르기 옆`);
          // 새 글자 없음: 화면에 보이는 글 노드는 기준(V5 꺼짐) 페이지 글에 있거나 순번·닫힌 라벨·따옴표
          const bp = base.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ");
          for (const t2 of readableTexts(x)) {
            const tx = t2.text.replace(/\s+/g, " ").trim();
            if (!tx || /^[\d\s.,:%+\-/]+$/.test(tx) || labels.has(tx) || /^[A-Z ]*\s?\d*$/.test(tx)) continue;
            if (!bp.includes(tx) && !bp.includes(tx.slice(0, 12))) f.push(`${id}/${a}: 장면에 입력에 없는 글 «${tx.slice(0, 16)}»`);
          }
        }
      }
    }
    setV5ArchetypeForTests(null);
    setDesignV5ForTests(false);
  }
  // ── Phase 3: 본문 글자
  for (const a of ARCHETYPE_IDS) {
    const t = ARCHETYPES[a];
    if (t.type.body < 15) f.push(`${a}: 본문 토큰 ${t.type.body}px < 15`);
    if (["impact", "pop", "softlife", "narrative"].includes(a) && t.type.body < 16) f.push(`${a}: 본문 토큰 16px 권장 미달`);
    if (t.type.lh > BODY_LINE_HEIGHT_MAX || t.type.lh < 1.7) f.push(`${a}: 행간 ${t.type.lh} (1.7~${BODY_LINE_HEIGHT_MAX})`);
    const long = "본문 문장이 충분히 길어서 한 줄을 넘어갑니다. ".repeat(3);
    const html = (px: number, extra = "", txt = long) => `<section><p style="margin:0;font-size:${px}px;font-weight:400;line-height:1.6;color:#111${extra}">${txt}</p></section>`;
    const o14 = typographyV5(html(14), t); const o15 = typographyV5(html(15), t);
    for (const [n, o] of [["14", o14], ["15", o15]] as const) {
      if (!o.includes(`font-size:${t.type.body}px`) || !o.includes(`line-height:${t.type.lh}`) || !/overflow-wrap:anywhere/.test(o)) f.push(`${a}: ${n}px 문단이 본문 토큰으로 안 바뀜`);
    }
    if (typographyV5(html(14, ";white-space:nowrap"), t).includes(`font-size:${t.type.body}px`)) f.push(`${a}: 한 줄 고정 요소가 바뀜`);
    if (typographyV5(html(14, ";text-transform:uppercase"), t).includes(`font-size:${t.type.body}px`)) f.push(`${a}: 대문자 라벨이 바뀜`);
    if (typographyV5(html(14, "", "짧은 글"), t).includes(`font-size:${t.type.body}px`)) f.push(`${a}: 짧은 글이 바뀜`);
    if (typographyV5(html(14), t, { body: false }).includes(`font-size:${t.type.body}px`)) f.push(`${a}: body:false인데 바뀜`);
    if (typographyV5(`<p style="font-size:14px;font-weight:700;color:#111">${long}</p>`, t).includes(`font-size:${t.type.body}px`)) f.push(`${a}: 굵은 글이 바뀜`);
    // 320폭: 16px 한 어절 한 줄 한도(272px)에 드는 어절 길이 = floor(272/16)=17자 — 더 긴 어절은 overflow-wrap:anywhere가 이미 붙는다
    if (FIT_AVAIL_PX / t.type.body < 15) f.push(`${a}: 본문 크기에서 한 줄 15자 미만`);
  }
  {
    const src = fs.readFileSync("lib/impact-templates.ts", "utf8");
    if (!/typographyV5\(tiered, ARCHETYPES\[s\.ax as ArchetypeId\], \{ body: s\.kind !== "note"/.test(src)) f.push("고지(note)·배송 블록이 본문 크기 변경에서 빠지지 않음");
  }
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const meds = corpus().map(([, file]) => bodyMedian(exportHtmlOf(file))).filter((x) => x > 0).sort((x, y) => x - y);
    const m = meds[Math.floor(meds.length / 2)]!;
    if (m < 15) f.push(`${a}: 말뭉치 본문 중앙값 ${m}px < 15`);
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  // ── 말뭉치: 밝은 성격은 진한 정보 구간 0
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    let sum = 0;
    for (const [id, file] of corpus()) {
      const h = exportHtmlOf(file);
      const n = darkInfoZones(h);
      sum += n;
      if (ARCHETYPES[a].infoBackdrop !== "scrim-deep" && n > 0) f.push(`${id}/${a}: 밝은 성격인데 진한 정보 구간 ${n}개`);
    }
    if (ARCHETYPES[a].infoBackdrop === "scrim-deep" && sum === 0) f.push(`${a}: 진한 성격인데 진한 정보 구간이 하나도 없음`);
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") + (f.length > 80 ? `\n… 외 ${f.length - 80}건` : "") : "통과"); process.exit(f.length ? 1 : 0); });
