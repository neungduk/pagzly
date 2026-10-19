/**
 * 회귀 — 405차 패션 히어로 원본일 때 배경 이미지 생성 건너뛰기. fetch를 가짜로 바꿔 사진 파이프라인 전체를 돌린다(유료 호출 0).
 * - 판단: 패션 + 1번 착장/코디 → 건너뜀, 그 밖(다른 카테고리 × 모든 역할 × 1~10장, 패션 비착용 히어로) → 이전과 같음(false)
 * - 건너뛸 때: 서버에 skipBackdropImage=true, 선택 화면 없음, 실패 처리 안 됨, 비히어로 합성은 섹션 배경만, 비용 backdrop 0
 * - 섹션 배경도 없으면 합성 호출 없이 원본
 * - 뷰티는 skipBackdropImage=false, 선택 화면·히어로 합성이 이전과 같다
 */
import fs from "node:fs";
import path from "node:path";
import { FASHION_CATEGORY, shouldSkipBackdropImage } from "../../lib/fashion-composite-policy";
import { PRODUCT_IMAGE_ROLES } from "../../lib/image-roles";
import { runPhotoEnhancementPipeline } from "../../lib/photo-pipeline-client";

export const name = "패션 히어로 원본일 때 배경 이미지 생성 건너뛰기";

type Call = { path: string; body: Record<string, unknown> };

function stubFetch(opts: { sectionOk: boolean }) {
  const calls: Call[] = [];
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const fake = async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push({ path: url, body });
    if (url === "/api/generate-backdrop") {
      const skip = body.skipBackdropImage === true;
      return json(200, {
        candidateUrls: skip ? [] : ["c0", "c1", "c2", "c3"],
        backdropSkipped: skip,
        productAlreadyComposited: !skip,
        cost: skip ? 0.0002 : 0.1602,
        conceptBriefCost: 0.0002,
        backdropCost: skip ? 0 : 0.16,
        claudeCost: 0.0022,
        shadowAnalysis: { promptHint: "soft" },
        conceptBrief: { theme: "t" },
        theme: { accent: "#123456", baseNeutral: "#eeeeee", deepAccent: "#001122" },
      });
    }
    if (url === "/api/section-backdrops") {
      return opts.sectionOk ? json(200, { ingredientUrl: "sec-ing", textureUrl: "sec-tex", cost: 0.006 }) : json(500, { error: "x" });
    }
    if (url === "/api/enhance-image") {
      if (body.flushCostTalliesOnly) return json(200, {});
      return json(200, { enhancedUrl: `enh-${String(body.imageUrl)}`, enhancedPath: `p-${String(body.imageUrl)}`, cost: 0.01, claudeCost: 0.005 });
    }
    return json(404, { error: "unexpected" });
  };
  return { calls, fake };
}

async function run1(category: string, roles: string[], sectionOk = true) {
  const { calls, fake } = stubFetch({ sectionOk });
  const orig = globalThis.fetch;
  globalThis.fetch = fake as typeof fetch;
  let picked = 0;
  try {
    const out = await runPhotoEnhancementPipeline({
      uploaded: roles.map((_, i) => ({ url: `u${i}`, path: `p${i}` })),
      category,
      productName: "p",
      brandName: null,
      price: 1,
      imageRoles: roles,
      pickBackdrop: async (urls) => {
        picked += 1;
        return urls[0]!;
      },
    });
    return { out, calls, picked };
  } finally {
    globalThis.fetch = orig;
  }
}

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // 판단 함수
  for (const category of ["화장품/뷰티", "전자제품", "식품/건강기능식품", "생활/리빙", "반려동물"]) {
    for (const role of PRODUCT_IMAGE_ROLES) {
      for (let n = 1; n <= 10; n++) {
        if (shouldSkipBackdropImage(category, Array(n).fill(role))) fails.push(`${category} ${role} ${n}장에서 건너뜀 — 이전과 달라짐`);
      }
    }
  }
  if (!shouldSkipBackdropImage(FASHION_CATEGORY, ["hero", "detail"])) fails.push("패션 착장 히어로에서 건너뛰지 않음");
  if (!shouldSkipBackdropImage(FASHION_CATEGORY, ["lifestyle"])) fails.push("패션 코디 히어로에서 건너뛰지 않음");
  for (const role of ["detail", "package", "other"]) if (shouldSkipBackdropImage(FASHION_CATEGORY, [role, "hero"])) fails.push(`패션 ${role} 히어로에서 건너뜀`);
  if (shouldSkipBackdropImage(FASHION_CATEGORY, [])) fails.push("역할 없음에서 건너뜀");

  // 파이프라인: 패션 착용 히어로 + 디테일·기타 합성
  const roles = ["hero", "hero", "detail", "other"];
  const a = await run1(FASHION_CATEGORY, roles);
  const bd = a.calls.find((c) => c.path === "/api/generate-backdrop");
  if (bd?.body.skipBackdropImage !== true) fails.push("패션 착용 히어로인데 skipBackdropImage가 서버로 가지 않음");
  if (a.picked) fails.push("배경 이미지를 건너뛰었는데 선택 화면을 기다림");
  if (a.out.backdropFailed) fails.push(`배경 건너뜀이 실패로 처리됨: ${a.out.warning}`);
  if (!a.calls.some((c) => c.path === "/api/section-backdrops")) fails.push("섹션 배경을 부르지 않음(shadowAnalysis 의존)");
  const enh = a.calls.filter((c) => c.path === "/api/enhance-image" && !c.body.flushCostTalliesOnly);
  if (enh.map((c) => c.body.imageUrl).join() !== "u2,u3") fails.push(`합성 호출 사진이 다름: ${enh.map((c) => c.body.imageUrl).join()}`);
  if (enh.some((c) => !String(c.body.backdropDataUrl).startsWith("sec-"))) fails.push("비히어로 합성이 섹션 배경이 아닌 배경을 씀");
  if (a.out.images.map((i) => i.origin).join() !== "original,original,enhanced,enhanced") fails.push(`origin: ${a.out.images.map((i) => i.origin).join()}`);
  if ((a.out.photoCostBreakdown.backdrop ?? -1) !== 0) fails.push(`비용 backdrop이 0이 아님: ${a.out.photoCostBreakdown.backdrop}`);

  // 섹션 배경까지 없으면 합성 호출 없이 원본
  const b = await run1(FASHION_CATEGORY, roles, false);
  const enhB = b.calls.filter((c) => c.path === "/api/enhance-image" && !c.body.flushCostTalliesOnly);
  if (enhB.length) fails.push(`배경이 하나도 없는데 합성을 부름: ${enhB.length}회`);
  if (b.out.images.some((i) => i.origin !== "original")) fails.push("배경이 없을 때 원본이 아닌 사진이 나옴");

  // 뷰티: 이전과 같음 — 건너뛰지 않고, 후보 4장이면 선택 화면, 히어로도 합성
  const c = await run1("화장품/뷰티", ["hero", "detail", "lifestyle", "other"]);
  if (c.calls.find((x) => x.path === "/api/generate-backdrop")?.body.skipBackdropImage !== false) fails.push("뷰티에서 skipBackdropImage가 false가 아님");
  if (c.picked !== 1) fails.push(`뷰티 선택 화면 호출 ${c.picked}회(기대 1)`);
  const enhC = c.calls.filter((x) => x.path === "/api/enhance-image" && !x.body.flushCostTalliesOnly).map((x) => x.body.imageUrl);
  if (!enhC.includes("u0")) fails.push("뷰티 히어로가 합성되지 않음");
  if ((c.out.photoCostBreakdown.backdrop ?? 0) !== 0.16) fails.push(`뷰티 backdrop 비용이 바뀜: ${c.out.photoCostBreakdown.backdrop}`);

  // 서버: 건너뛸 때만 생성 함수를 부르지 않는다(기본값은 그대로 생성)
  const route = fs.readFileSync(path.join(__dirname, "..", "..", "app", "api", "generate-backdrop", "route.ts"), "utf8");
  if (!/const skipped = skipBackdropImage === true;/.test(route)) fails.push("generate-backdrop에 skipBackdropImage 기본 false 처리가 없음");
  if (!/= skipped\s*\?\s*\{ buffer: undefined, candidateUrls: \[\] as string\[\], cost: 0, shadow: heroShadow/.test(route)) fails.push("건너뛸 때 heroShadow를 그대로 돌려주지 않음");
  return fails;
}
