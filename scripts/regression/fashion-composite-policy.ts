/**
 * 회귀 — 패션 착용컷 합성 제외(404차). 패션 + 착장/코디 → 원본, 패션 + 디테일·패키지·기타 → 합성,
 * 다른 카테고리는 모든 역할에서 이전 규칙(히어로 또는 합성 상한 안 → 합성)과 같아야 한다.
 * 사진 파이프라인·초안 화면이 이 판단을 쓰는지도 본다. 유료 호출 0.
 */
import fs from "node:fs";
import path from "node:path";
import {
  FASHION_CATEGORY,
  isHeroKeptOriginal,
  planStudioComposite,
  type StudioCompositeDecision,
} from "../../lib/fashion-composite-policy";
import { PRODUCT_IMAGE_ROLES } from "../../lib/image-roles";

export const name = "패션 착용컷 합성 제외";

const OTHER_CATEGORIES = ["화장품/뷰티", "전자제품", "식품/건강기능식품", "생활/리빙", "반려동물"];

/** 404차 이전 enhanceImages 루프 그대로: 히어로는 항상 합성, 나머지는 상한 안이면 합성 */
function legacyPlan(count: number, studioLimit: number): StudioCompositeDecision[] {
  return Array.from({ length: count }, (_, i) => (i !== 0 && i >= studioLimit ? "original-limit" : "composite"));
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // 402차 입력과 같은 역할 구성(착장 4·코디 1·디테일 1·기타 2)
  const roles402 = ["hero", "detail", "hero", "other", "hero", "lifestyle", "hero", "other"];
  const plan = planStudioComposite({ category: FASHION_CATEGORY, roles: roles402, count: 8, studioLimit: 8 });
  roles402.forEach((role, i) => {
    const want = role === "hero" || role === "lifestyle" ? "original-worn" : "composite";
    if (plan[i] !== want) fails.push(`패션 ${i + 1}번(${role}) → ${plan[i]} (기대 ${want})`);
  });
  if (!isHeroKeptOriginal(FASHION_CATEGORY, ["hero"])) fails.push("패션 히어로(착장)가 원본으로 판단되지 않음");
  if (!isHeroKeptOriginal(FASHION_CATEGORY, ["lifestyle"])) fails.push("패션 히어로(코디)가 원본으로 판단되지 않음");
  if (isHeroKeptOriginal(FASHION_CATEGORY, ["detail"])) fails.push("패션 히어로(디테일)가 원본으로 판단됨 — 합성 대상이어야 함");
  if (isHeroKeptOriginal(FASHION_CATEGORY, [])) fails.push("역할이 없는데 원본으로 판단됨 — 이전 동작이어야 함");
  // 패션이어도 상한 밖 디테일은 이전처럼 원본(상한 규칙 유지)
  const limited = planStudioComposite({ category: FASHION_CATEGORY, roles: ["detail", "detail", "detail"], count: 3, studioLimit: 2 });
  if (limited.join() !== "composite,composite,original-limit") fails.push(`패션 디테일 상한 규칙이 바뀜: ${limited.join()}`);

  // 다른 카테고리: 모든 역할 조합·장수에서 이전 규칙과 같아야 한다
  for (const category of OTHER_CATEGORIES) {
    for (const role of PRODUCT_IMAGE_ROLES) {
      for (let count = 1; count <= 10; count++) {
        for (const studioLimit of [count, 3, 4, 8]) {
          const got = planStudioComposite({ category, roles: Array(count).fill(role), count, studioLimit }).join();
          const want = legacyPlan(count, studioLimit).join();
          if (got !== want) {
            fails.push(`${category} ${role} ${count}장 상한 ${studioLimit}: ${got} ≠ 이전 ${want}`);
          }
        }
      }
      if (isHeroKeptOriginal(category, [role])) fails.push(`${category} 히어로(${role})가 원본으로 판단됨`);
    }
  }

  const root = path.join(__dirname, "..", "..");
  const pipeline = fs.readFileSync(path.join(root, "lib", "photo-pipeline-client.ts"), "utf8");
  if (!pipeline.includes("planStudioComposite(")) fails.push("photo-pipeline-client.ts가 planStudioComposite를 쓰지 않음");
  if (!/imageRoles\?:/.test(pipeline)) fails.push("runPhotoEnhancementPipeline에 imageRoles 인자가 없음");
  const draft = fs.readFileSync(path.join(root, "app", "create", "draft", "page.tsx"), "utf8");
  const call = draft.indexOf("runPhotoEnhancementPipeline({");
  const callEnd = draft.indexOf("});", call);
  if (call < 0 || !draft.slice(call, callEnd).includes("imageRoles")) fails.push("draft/page.tsx가 runPhotoEnhancementPipeline에 역할을 넘기지 않음");
  return fails;
}
