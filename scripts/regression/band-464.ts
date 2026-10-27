/**
 * 회귀 — 464차 강조 띠 쏠림 해소(UP1 뒤, 브라우저·네트워크 없음: 말뭉치 export 문자열만).
 * 463차에는 말뭉치 21개 중 18개 페이지에 같은 위치(55%)에 같은 모양으로 생겼다. 464차: ① 시드 통과 약 60% × 후보 있는 페이지만 ② 위치 45~65% 시드 ③ 형태 3가지 시드
 * ④ 다른 임팩트 섹션에 같은 글이 그대로 있으면 제외. 여기서는 말뭉치에서 등장 비율·위치 분포·형태·중복·결정성·금지 패턴을 잠근다.
 * UP1은 `designUp1On()`을 매번 읽으므로 같은 프로세스에서 꺼짐 → 켜짐 순으로 렌더하고 끝에서 복원한다.
 */
import { designUp1On, setDesignUp1ForTests } from "../../lib/design-v4";
import { STATEMENT_FORMS, statementWanted } from "../../lib/layout-variants";
import fs from "node:fs";
import { applyDisplayRules } from "../../lib/display-sections";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { signatureOf, topSections } from "../variety-metrics-463";

export const name = "강조 띠 464 — 등장 비율 30~70%·위치 분산·형태 2종 이상·중복 없음·결정성·금지 패턴(UP1)";

const FORBIDDEN = [":has(", "container-type", "mix-blend-mode", "clip-path", "-webkit-text-stroke", "text-wrap", "mask:", "mask-image", "white-space:nowrap"];
const unesc = (t: string): string => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const textNodes = (html: string): string[] => html.replace(/<svg[\s\S]*?<\/svg>/g, "").split(/<[^>]+>/).map((t) => unesc(t).trim()).filter(Boolean);

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };
  const defaultOn = designUp1On();

  // 시드 통과 규칙: 결정적이고 약 60%
  const passes = Array.from({ length: 1000 }, (_, i) => statementWanted(i * 2654435761 >>> 0)).filter(Boolean).length;
  ok(passes > 450 && passes < 750, `시드 통과율 ${passes / 10}% (60% 안팎이어야 함)`);
  ok(statementWanted(12345) === statementWanted(12345), "시드 통과 결정성");
  ok(STATEMENT_FORMS.length === 3 && STATEMENT_FORMS.join() === "band,quote,rule", "형태 3가지");

  setDesignUp1ForTests(false);
  const files = corpus();
  if (files.length < 18) { setDesignUp1ForTests(defaultOn); return f; } // 말뭉치가 없는 환경에서는 건너뜀
  for (const [id, file] of files) if (topSections(exportHtmlOf(file)).some((s) => signatureOf(s).startsWith("statement."))) f.push(`${id}: UP1 꺼짐인데 강조 띠`);

  setDesignUp1ForTests(true);
  try {
    const rows = files.map(([id, file]) => ({ id, html: exportHtmlOf(file) }));
    const again = files.map(([, file]) => exportHtmlOf(file));
    ok(rows.every((r, i) => r.html === again[i]), "같은 상품 두 번 렌더 결과가 다름(결정성)");
    const bands: Array<{ id: string; sig: string; at: number; n: number; sec: string; others: string }> = [];
    for (const r of rows) {
      const secs = topSections(r.html);
      const sigs = secs.map(signatureOf);
      const idx = sigs.map((s, i) => (s.startsWith("statement.") ? i : -1)).filter((i) => i >= 0);
      if (idx.length > 1) f.push(`${r.id}: 강조 띠가 ${idx.length}개`);
      if (idx.length === 1) {
        const i = idx[0]!;
        bands.push({ id: r.id, sig: sigs[i]!, at: i, n: secs.length, sec: secs[i]!, others: secs.filter((x, k) => k !== i && /data-pz-impact=/.test(x.slice(0, x.indexOf(">")))).join("\n") });
      }
    }
    const ratio = bands.length / rows.length;
    ok(ratio >= 0.3 && ratio <= 0.7, `등장 비율 ${(ratio * 100).toFixed(0)}% (${bands.length}/${rows.length}) — 30~70% 안이어야 함`);

    // 위치 분산: 페이지 안 섹션 위치(인덱스/전체)를 0.05 폭 구간으로 — 최소 3개 구간, 한 구간이 60%를 넘지 않음
    const bins = new Map<number, number>();
    for (const b of bands) { const k = Math.floor((b.at / b.n) / 0.05); bins.set(k, (bins.get(k) ?? 0) + 1); }
    ok(bins.size >= 3, `위치가 ${bins.size}개 구간에만 분포`);
    ok(Math.max(0, ...bins.values()) <= Math.ceil(bands.length * 0.6), `한 위치 구간에 ${Math.max(0, ...bins.values())}/${bands.length}개가 몰림`);
    ok(new Set(bands.map((b) => b.sig)).size >= 2, `형태가 ${[...new Set(bands.map((b) => b.sig))].join(",")} 한 가지뿐`);

    for (const b of bands) {
      // 중복 없음: 띠의 글이 같은 페이지 다른 임팩트 섹션의 글 노드와 그대로 같지 않다
      const mine = textNodes(b.sec).filter((t) => t.length >= 8 && !/^(STEP|POINT|CHECK|STORY|SPEC|DETAIL)\b/.test(t) && t !== "“");
      const theirs = new Set(textNodes(b.others));
      for (const t of mine) if (theirs.has(t)) f.push(`${b.id}: 띠의 글이 다른 임팩트 섹션과 그대로 같음 «${t.slice(0, 24)}»`);
      for (const k of FORBIDDEN) if (b.sec.replace(/<span aria-hidden="true" data-pz-(?:motif|divider|ghost)[\s\S]*?<\/span>/g, "").includes(k)) f.push(`${b.id}: 띠에 금지 패턴 ${k}`);
      for (const m of b.sec.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 12) f.push(`${b.id}: 띠에 12px 미만 글자`);
      // 띠의 큰 글(본문 문장)은 24px 이상
      const big = [...b.sec.matchAll(/font-size:(\d+)px[^>]*>(?:<[^>]+>)*[^<]{8,}/g)].map((m) => Number(m[1]));
      if (big.length && Math.max(...big) < 26) f.push(`${b.id}: 띠 글자가 26px 미만`);
    }

    // 편집 UI: 편집 모드에서는 표시 규칙이 v4 계획 앞에서 끝나므로(display-sections의 editing 조기 반환) UP1에서도 usage_steps는 원본 섹션 그대로 — 새 변형이 편집 대상 글을 가리지 않는다
    const ds = fs.readFileSync("lib/display-sections.ts", "utf8");
    ok(ds.indexOf("if (opts.editing) return {") > 0 && ds.indexOf("if (opts.editing) return {") < ds.indexOf("planV4("), "편집 모드 조기 반환이 v4 계획보다 뒤에 있음");
    for (const [id, file] of files) {
      const a = exportArgsOf(readSession(file));
      const srcSteps = (a.sections as Array<{ type: string }>).filter((x) => x.type === "usage_steps").length;
      const edited = applyDisplayRules(a.sections, a.imageUrls ?? [], { editing: true, imageHashByUrl: a.imageHashByUrl, roles: a.imageRoles, origins: a.imageOrigins, category: a.category, claimFacts: a.claimFacts, brandName: a.brandName });
      const secs = edited.sections as Array<{ type: string; kind?: string }>;
      if (secs.some((x) => x.type === "impact" && x.kind === "v4")) f.push(`${id}: 편집 모드에 v4 블록이 있음`);
      if (secs.filter((x) => x.type === "usage_steps").length !== srcSteps) f.push(`${id}: 편집 모드에서 usage_steps가 원본과 다름`);
    }
  } finally {
    setDesignUp1ForTests(defaultOn);
  }
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
