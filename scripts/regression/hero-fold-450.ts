/**
 * 회귀 — 450차 2 히어로 A 글 블록 압축. ① 예산(사진 높이의 38%) 이하면 접지 않는다 ② 넘으면 낮은 우선순위부터(해시태그 → 보조줄 → 제품명 보조줄 → 훅 2줄)
 * ③ 제품명·훅·가격은 접지 않는다(훅은 2줄 말줄임까지만) ④ 접힌 문구는 마크업에 그대로 남는다(원문 보존) ⑤ 짧은 입력은 off와 같은 접힘 없음 ⑥ 필수 요소(제품명·가격) 유지.
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { HERO_A_BLOCK_BUDGET, heroABlockFold, type HeroV2Plan } from "../../lib/hero-spec";
import { exportArgsOf, corpus } from "../design-corpus";
import fs from "node:fs";

export const name = "히어로 A 글 블록 압축 — 예산 이하 접지 않음·우선순위 순서·제품명/가격 불변·접힌 문구 원문 보존";

type Hero = Parameters<typeof heroABlockFold>[1];
const plan = (o: Partial<HeroV2Plan>): HeroV2Plan => ({ variant: "A", photoKind: "person", confidence: 0.9, name: "무선 키보드", imageUrl: "x", whiteBg: false, badges: [], tags: [], pos: "50% 50%", v3: { price: "89,000원", motifVariant: 0, mood: null }, ...o }) as HeroV2Plan;
const hero = (headline: string, subheadline = ""): Hero => ({ type: "hero", slot: "hero", headline, subheadline }) as Hero;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  if (HERO_A_BLOCK_BUDGET !== 0.38) fails.push(`예산 ${HERO_A_BLOCK_BUDGET} ≠ 0.38`);
  const short = heroABlockFold(plan({}), hero("조용한 타건"), 44);
  if (short.fold.tags || short.fold.sub || short.fold.nameSub || short.fold.hookLines) fails.push(`짧은 입력이 접힘: ${JSON.stringify(short.fold)}`);
  const withTags = heroABlockFold(plan({ tags: ["가", "나", "다"] }), hero("조용한 타건", "소음은 줄이고 타건감은 살렸습니다"), 44);
  if (!withTags.fold.tags) fails.push("예산 초과인데 해시태그(최하위)를 먼저 접지 않음");
  const longP = plan({ name: "저소음 기계식 무선 키보드 프로 마스터 에디션", nameSub: "Silent Mechanical Wireless Keyboard", tags: ["가", "나"] });
  const longH = hero("귀는 막지 마세요, 소음은 막고. 하루 종일 쳐도 손목이 편한 저소음 타건감 그리고 더 많은 설명이 이어집니다 정말로", "오픈형의 자유로움, ANC 42dB의 조용함을 하나로 담았습니다.");
  const lg = heroABlockFold(longP, longH, 32);
  if (!(lg.fold.tags && lg.fold.sub && lg.fold.nameSub)) fails.push(`긴 입력의 접힘 순서 부족: ${JSON.stringify(lg.fold)}`);
  if (lg.fold.hookLines !== undefined && lg.fold.hookLines < 2) fails.push(`훅을 2줄 밑으로 줄임: ${lg.fold.hookLines}`);
  // 우선순위 단조: 하위가 접히지 않았는데 상위만 접힌 경우 없음
  const f = lg.fold;
  if ((f.sub && !f.tags) || (f.nameSub && !f.sub) || (f.hookLines && !f.nameSub)) fails.push(`우선순위 역전: ${JSON.stringify(f)}`);
  // 마크업: 접힌 문구 원문 보존 + 제품명·가격 접힘 표시 없음
  const file = corpus({ only: ["fx-tech-keyboard"] })[0]![1];
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  s.visionImageRoles = [{ index: 0, role: "hero", confidence: 0.9, reason: "", tags: ["모델", "착용", "전신"] }];
  const h = (s.generated.sections as Array<Record<string, string>>).find((x) => x.type === "hero")!;
  s.productName = "저소음 기계식 무선 키보드 프로 마스터 에디션";
  h.headline = "귀는 막지 마세요, 소음은 막고. 하루 종일 쳐도 손목이 편한 저소음 타건감";
  h.subheadline = "오픈형의 자유로움, ANC 42dB의 조용함을 하나로 담았습니다. 사무실에서도 카페에서도 같은 느낌으로.";
  const html = buildDetailPageHtml(exportArgsOf(s));
  const A = html.match(/<section data-hero-v2="A"[\s\S]*?<\/section>/)?.[0] ?? "";
  if (!A) fails.push("히어로 A 마크업을 못 찾음");
  else {
    if (!A.includes("data-hero-fold")) fails.push("긴 입력인데 접힘 표시(data-hero-fold)가 없음");
    for (const t of [h.subheadline, h.headline]) if (!A.replace(/&#39;|&apos;/g, "'").includes(t)) fails.push(`접힌/말줄임 문구 원문이 마크업에서 사라짐: ${t.slice(0, 12)}`);
    if (/data-hero-name[^>]*data-hero-fold|<h1[^>]*data-hero-fold/.test(A)) fails.push("제품명이 접힘");
    if (!A.includes("89,000") && !A.includes("189,000")) fails.push("가격이 히어로에서 사라짐");
    if (/data-hero-hook[^>]*data-hero-fold/.test(A)) fails.push("훅이 접힘(말줄임만 허용)");
  }
  return fails;
}
