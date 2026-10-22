/**
 * 439차 — 디자인 검증 말뭉치(무료: 브라우저·dev 서버·유료 API 없음).
 * 저장 세션 6종 + 합성 픽스처(scripts/fixtures/archetype-*.json)를 결과 페이지의 HTML 내려받기와 같은 인자로 export HTML로 뽑는다.
 * 플래그(NEXT_PUBLIC_*)는 모듈을 불러올 때 읽히므로, 호출하는 쪽이 process.env를 정한 뒤 이 파일을 동적 import 한다.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";
import { claimFactsOf, type ClaimInput } from "../lib/numeric-claim-gate";
import { hasSizeHeight } from "../lib/scene-size";
import { resolveStylePack } from "../lib/style-packs";
import { applyDisplayRules } from "../lib/display-sections";

export const SAVED_SESSIONS: Array<[string, string]> = [
  ["s411", "review/411-live/fashion/session.json"],
  ["s414", "review/414-live/fashion/session.json"],
  ["s417", "review/417-live/fashion/session.json"],
  ["s418", "review/418-live/beauty/session.json"],
  ["s422", "review/422-live/beauty/session.json"],
  ["selec", "review/pexels-electronics-detail/session.json"],
];

/** 말뭉치 목록. 저장 세션은 review/ 아래라 없는 환경(새 체크아웃)에서는 합성 픽스처만 쓴다 */
export function corpus(opts: { only?: string[] } = {}): Array<[string, string]> {
  const fx = fs.existsSync("scripts/fixtures")
    ? fs.readdirSync("scripts/fixtures").filter((f) => f.startsWith("archetype-") && f.endsWith(".json")).sort().map((f) => [`fx-${f.replace("archetype-", "").replace(".json", "")}`, path.join("scripts/fixtures", f)] as [string, string])
    : [];
  const all = [...SAVED_SESSIONS.filter(([, f]) => fs.existsSync(f)), ...fx];
  return opts.only?.length ? all.filter(([id]) => opts.only!.includes(id)) : all;
}

type Session = Record<string, any>;
const tagsOf = (s: Session): string[][] | undefined => {
  const v = s.visionImageRoles as Array<{ index?: number; tags?: string[] }> | undefined;
  if (!v?.length) return undefined;
  const out: string[][] = [];
  for (const r of v) if (typeof r.index === "number") out[r.index] = r.tags ?? [];
  return out;
};

/** 결과 페이지 handleDownloadHtml과 같은 인자(스타일 팩은 세션 값 → 없으면 카테고리 기본) */
export function exportArgsOf(s: Session): Parameters<typeof buildDetailPageHtml>[0] {
  const g = s.generated ?? s;
  const theme = g.theme ? { ...getCategoryTheme(s.category), ...g.theme } : getCategoryTheme(s.category);
  return {
    productName: s.productName, brandName: s.brandName, logoUrl: s.logoUrl, ingredients: s.ingredients, keyFeatures: s.keyFeatures, price: s.price,
    category: s.category, sections: g.sections, imageUrls: s.imageUrls ?? g.imageUrls, theme, description: g.description, features: g.features, howToUse: g.howToUse, caution: g.caution,
    certifications: s.certifications, imageHashByUrl: g.imageHashByUrl, imageRoles: g.imageRoles ?? s.imageRoles, imageOrigins: s.imageOrigins,
    stylePackId: resolveStylePack(s.category, s.stylePackId).id, infoBackdrops: s.infoBackdrops, imageTags: tagsOf(s),
    sceneImages: s.sceneImagesOn ? s.sceneImages : undefined, hasSizeInfo: hasSizeHeight(s.productSizeHint), claimFacts: claimFactsOf(s as unknown as ClaimInput),
  };
}

export const readSession = (file: string): Session => JSON.parse(fs.readFileSync(file, "utf8"));
export const exportHtmlOf = (file: string): string => buildDetailPageHtml(exportArgsOf(readSession(file)));

/** 표시 규칙만 돌린 섹션 목록(린트·분포 보고용) */
export function displayOf(file: string) {
  const a = exportArgsOf(readSession(file));
  return applyDisplayRules(a.sections, a.imageUrls, { imageHashByUrl: a.imageHashByUrl, roles: a.imageRoles, origins: a.imageOrigins, category: a.category, tags: a.imageTags, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts, brandName: a.brandName });
}
