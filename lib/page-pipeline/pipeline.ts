import fs from "fs";
import path from "path";
import { getCategoryTheme } from "@/lib/category-theme";
import {
  generateDetailCopyWithDeepSeek,
  planPageStructureWithClaude,
} from "@/lib/copy-orchestrator";
import type { DetailPageCopy, PageStructurePlan } from "@/lib/copy-orchestrator/types";
import { buildDetailPageHtml } from "@/lib/export-detail-html";
import {
  executeImagePlan,
  planImagesWithClaude,
} from "@/lib/image-router/orchestrator";
import type { ImagePlan } from "@/lib/image-router/orchestrator/image-plan-types";
import { resetAllBudgets } from "@/lib/image-router/budget";
import {
  addJobSpend,
  addJobWarning,
  assertBudgetAllows,
  BudgetExceededError,
  createPageGenerationJob,
  getPageGenerationJob,
  updatePageGenerationJob,
} from "@/lib/page-pipeline/job-store";
import { mapCopyToDetailSections } from "@/lib/page-pipeline/map-to-sections";
import { runImageQualityPass } from "@/lib/page-pipeline/quality-pass";
import type {
  PageData,
  PageGenerationCostBreakdown,
  PageGenerationJob,
  PageGenerationMetadata,
  PageImageAsset,
  PagePipelineInput,
} from "@/lib/page-pipeline/types";

function pathToFileUrl(p: string): string {
  const resolved = path.resolve(p);
  if (process.platform === "win32") {
    return `file:///${resolved.replace(/\\/g, "/")}`;
  }
  return `file://${resolved}`;
}

function emptyCopyFallback(
  product: PagePipelineInput["product"],
  structure: PageStructurePlan,
): DetailPageCopy {
  const usp = structure.usps[0] ?? product.productName;
  return {
    mainHeadline: product.productName,
    subHeadline: usp,
    problemStatement: "일상에서 느끼는 작은 불편을 해결해 보세요.",
    solutionStatement: `${product.productName}으로 더 편리한 선택을 할 수 있습니다.`,
    benefit: structure.usps[0] ?? "실용적인 선택",
    feature: structure.usps[1] ?? product.keyFeatures?.split(",")[0]?.trim() ?? "핵심 특징",
    featureDescription: product.description ?? product.keyFeatures ?? product.productName,
    socialProofPlaceholder: "[고객 후기 영역 — 실제 후기 연동 예정]",
    faq: [
      {
        question: "구성은 어떻게 되나요?",
        answer: product.keyFeatures ?? "상품 상세 정보를 확인해 주세요.",
      },
      {
        question: "주의사항이 있나요?",
        answer: "제품 라벨과 판매자 안내를 우선해 주세요.",
      },
    ],
    cta: "상품 확인하기",
    sections: structure.pageStructure.map((s) => ({
      type: s.type,
      title: s.purpose.slice(0, 40),
      body: s.copyDirection.slice(0, 160),
    })),
    headline: product.productName,
  };
}

/**
 * Unified Pagzly detail-page pipeline.
 * Does NOT modify /api/generate. Composes STEP 8–9 + renderer.
 */
export async function runPageGenerationPipeline(
  input: PagePipelineInput,
): Promise<PageGenerationJob> {
  const budgetUsd = input.budgetUsd ?? Number(process.env.PAGE_PIPELINE_BUDGET_USD ?? 1.5);
  const maxImages = input.maxImages ?? Number(process.env.PAGE_PIPELINE_MAX_IMAGES ?? 2);
  const draftToken = input.draftToken ?? `page-${Date.now()}`;
  const userId = input.userId ?? "page-pipeline-e2e";

  const job = createPageGenerationJob(budgetUsd);
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const notify = (next: PageGenerationJob) => {
    input.onStatusChange?.(next);
  };

  let structure: PageStructurePlan | undefined;
  let copy: DetailPageCopy | undefined;
  let imagePlan: ImagePlan | undefined;
  let costBreakdown: PageGenerationCostBreakdown = {
    claudeStructureUsd: 0,
    claudeImagePlanUsd: 0,
    deepSeekCopyUsd: 0,
    imagesUsd: 0,
    regenerateUsd: 0,
    totalUsd: 0,
  };
  let totalRetryCount = 0;
  const modelsUsed = new Set<string>();
  const providersUsed = new Set<string>();
  const qualityScores: number[] = [];

  const outputDir =
    input.outputDir ??
    path.join(
      process.cwd(),
      "scripts",
      "test-output",
      "page-pipeline-step10",
      draftToken,
    );
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    resetAllBudgets();

    // ── 1–2. ANALYZING: Claude product analysis + page structure ──
    let current = updatePageGenerationJob(job.id, {
      status: "ANALYZING",
      startedAt,
    });
    notify(current);
    assertBudgetAllows(current, 0.05);

    const claudeStructure = await planPageStructureWithClaude({
      productName: input.product.productName,
      category: input.product.category,
      brandName: input.product.brandName,
      description: input.product.description,
      keyFeatures: input.product.keyFeatures,
      ingredients: input.product.ingredients,
      certifications: input.product.certifications,
      targetCustomer: input.product.targetCustomer,
      price: input.product.price,
      productImageUrls: input.product.productImageUrls,
    });
    structure = claudeStructure.structure;
    costBreakdown.claudeStructureUsd = claudeStructure.claudeCostUsd;
    modelsUsed.add(claudeStructure.model);
    current = addJobSpend(job.id, claudeStructure.claudeCostUsd);
    notify(current);

    // ── 3. PLANNING: Claude imagePlan ──
    current = updatePageGenerationJob(job.id, { status: "PLANNING" });
    notify(current);
    assertBudgetAllows(current, 0.05);

    const claudePlan = await planImagesWithClaude({
      productName: input.product.productName,
      category: input.product.category,
      brandName: input.product.brandName,
      description: input.product.description,
      keyFeatures: input.product.keyFeatures,
      ingredients: input.product.ingredients,
      targetCustomer: input.product.targetCustomer,
      price: input.product.price,
      productImageUrls: input.product.productImageUrls,
    });
    imagePlan = claudePlan.plan;
    costBreakdown.claudeImagePlanUsd = claudePlan.claudeCostUsd;
    modelsUsed.add(claudePlan.model);
    current = addJobSpend(job.id, claudePlan.claudeCostUsd);
    notify(current);

    // ── 4. GENERATING_COPY: DeepSeek (retry → fallback) ──
    current = updatePageGenerationJob(job.id, { status: "GENERATING_COPY" });
    notify(current);
    assertBudgetAllows(current, 0.01);

    try {
      const deepseek = await generateDetailCopyWithDeepSeek(
        {
          productName: input.product.productName,
          category: input.product.category,
          brandName: input.product.brandName,
          description: input.product.description,
          keyFeatures: input.product.keyFeatures,
          ingredients: input.product.ingredients,
          certifications: input.product.certifications,
          targetCustomer: input.product.targetCustomer,
          price: input.product.price,
        },
        structure,
      );
      copy = deepseek.copy;
      costBreakdown.deepSeekCopyUsd = deepseek.deepSeekCostUsd;
      modelsUsed.add(deepseek.model);
      current = addJobSpend(job.id, deepseek.deepSeekCostUsd);
      for (const w of deepseek.hallucinationWarnings) {
        current = addJobWarning(job.id, `copy hallucination: ${w}`);
      }
      notify(current);
    } catch (copyErr) {
      totalRetryCount += 1;
      current = addJobWarning(
        job.id,
        `DeepSeek failed — fallback copy: ${copyErr instanceof Error ? copyErr.message : String(copyErr)}`,
      );
      copy = emptyCopyFallback(input.product, structure);
      notify(current);
    }

    // ── 5. GENERATING_IMAGES: ImageRouter ──
    current = updatePageGenerationJob(job.id, { status: "GENERATING_IMAGES" });
    notify(current);
    assertBudgetAllows(current, 0.03 * Math.max(1, maxImages));

    const exec = await executeImagePlan({
      plan: imagePlan,
      productImageUrls: input.product.productImageUrls,
      maxImages,
      resolution: "768",
      context: {
        userId,
        draftToken,
        pageId: job.id,
      },
      onItemDone: (entry) => {
        if (entry.result.provider) providersUsed.add(entry.result.provider);
        if (entry.result.model) modelsUsed.add(entry.result.model);
        totalRetryCount += entry.result.retryCount ?? 0;
      },
    });
    costBreakdown.imagesUsd = exec.totalImageCostUsd;
    current = addJobSpend(job.id, exec.totalImageCostUsd);
    notify(current);

    if (current.spentUsd > current.budgetUsd) {
      throw new BudgetExceededError(current.spentUsd, current.budgetUsd);
    }

    // ── 6. EVALUATING_IMAGES (+ REGENERATING) ──
    current = updatePageGenerationJob(job.id, { status: "EVALUATING_IMAGES" });
    notify(current);

    let qualityItems = await runImageQualityPass({
      items: exec.items,
      productImageUrls: input.product.productImageUrls,
      scratchDir: path.join(outputDir, "quality"),
      context: { userId, draftToken, pageId: job.id },
      beforeRegenerate: (est) => {
        const j = updatePageGenerationJob(job.id, { status: "REGENERATING" });
        notify(j);
        assertBudgetAllows(j, est);
      },
    });

    costBreakdown.regenerateUsd = qualityItems.regenerateCostUsd;
    totalRetryCount += qualityItems.totalRetryCount;
    current = addJobSpend(job.id, qualityItems.regenerateCostUsd);
    for (const w of qualityItems.warnings) {
      current = addJobWarning(job.id, w);
    }
    for (const q of qualityItems.items) {
      if (q.qualityScore != null) qualityScores.push(q.qualityScore);
      if (q.entry.result.provider) providersUsed.add(q.entry.result.provider);
      if (q.entry.result.model) modelsUsed.add(q.entry.result.model);
    }
    notify(current);

    // Final image selection: succeeded regenerated-or-original first, else product photo
    const selectedAssets: PageImageAsset[] = [];
    for (const q of qualityItems.items) {
      const url = q.entry.result.outputUrls[0];
      if (q.entry.result.status === "succeeded" && url) {
        selectedAssets.push({
          order: q.entry.item.order,
          role: q.entry.item.taskType,
          url,
          provider: q.entry.result.provider,
          model: q.entry.result.model,
          costUsd: q.entry.result.actualCost + q.regenerateCostUsd,
          qualityScore: q.qualityScore,
          regenerated: q.regenerated,
        });
      }
    }

    // Fallback: ensure at least product image exists for renderer
    if (selectedAssets.length === 0 && input.product.productImageUrls[0]) {
      current = addJobWarning(job.id, "no AI images succeeded — using product photo");
      selectedAssets.push({
        order: 1,
        role: "PRODUCT_FALLBACK",
        url: input.product.productImageUrls[0],
        provider: "none",
        model: "original",
        costUsd: 0,
        qualityScore: null,
        regenerated: false,
      });
      notify(current);
    }

    const imageUrls = selectedAssets.map((a) => a.url);

    // Persist binary previews when data URLs
    for (let i = 0; i < selectedAssets.length; i += 1) {
      const a = selectedAssets[i]!;
      if (a.url.startsWith("data:")) {
        const m = a.url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (m) {
          const ext = m[1]!.includes("png") ? "png" : m[1]!.includes("webp") ? "webp" : "jpg";
          const filePath = path.join(outputDir, `image-${i + 1}.${ext}`);
          fs.writeFileSync(filePath, Buffer.from(m[2]!, "base64"));
          // Keep data URL for HTML self-containment; also note file beside
          selectedAssets[i] = { ...a, url: a.url };
          void filePath;
        }
      } else if (fs.existsSync(a.url) && !a.url.startsWith("http")) {
        // Local path — embed as data URL for portable HTML
        const buf = fs.readFileSync(a.url);
        const lower = a.url.toLowerCase();
        const mime = lower.endsWith(".png")
          ? "image/png"
          : lower.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg";
        const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
        selectedAssets[i] = { ...a, url: dataUrl };
        imageUrls[i] = dataUrl;
      }
    }

    // ── 7. RENDERING: PageData + existing HTML renderer ──
    current = updatePageGenerationJob(job.id, { status: "RENDERING" });
    notify(current);

    const sections = mapCopyToDetailSections(copy!, input.product, imageUrls.length);
    costBreakdown.totalUsd =
      Math.round(
        (costBreakdown.claudeStructureUsd +
          costBreakdown.claudeImagePlanUsd +
          costBreakdown.deepSeekCopyUsd +
          costBreakdown.imagesUsd +
          costBreakdown.regenerateUsd) *
          1_000_000,
      ) / 1_000_000;

    const metadata: PageGenerationMetadata = {
      totalGenerationTimeMs: Date.now() - t0,
      totalImageCount: selectedAssets.length,
      totalRetryCount,
      totalAiCostUsd: costBreakdown.totalUsd,
      costBreakdown,
      imageProvidersUsed: [...providersUsed],
      modelsUsed: [...modelsUsed],
      qualityScores,
      warnings: getPageGenerationJob(job.id)?.warnings ?? [],
      budgetUsd,
      budgetExceeded: false,
    };

    const pageData: PageData = {
      product: input.product,
      copy: copy!,
      structure: structure!,
      imagePlan: imagePlan!,
      sections,
      images: selectedAssets.map((a, i) => ({
        ...a,
        url: imageUrls[i] ?? a.url,
      })),
      imageUrls,
      metadata,
    };

    const theme = getCategoryTheme(input.product.category);
    const html = buildDetailPageHtml({
      productName: input.product.productName,
      brandName: input.product.brandName,
      price: input.product.price ?? undefined,
      category: input.product.category,
      sections,
      imageUrls,
      theme,
      description: copy!.featureDescription ?? copy!.solutionStatement,
      features: [
        copy!.benefit,
        copy!.feature,
        ...(structure?.usps ?? []),
      ].filter(Boolean),
      howToUse: copy!.sections.find((s) => /사용|HOW/i.test(s.title))?.body ?? "",
      caution:
        copy!.faq.find((f) => /주의|안전|caution/i.test(f.question))?.answer ??
        "제품 라벨과 판매자 안내를 우선해 주세요.",
      certifications: input.product.certifications,
    });

    const htmlPath = path.join(outputDir, "detail-page.html");
    const jsonPath = path.join(outputDir, "page-data.json");
    fs.writeFileSync(htmlPath, html, "utf8");
    fs.writeFileSync(jsonPath, JSON.stringify(pageData, null, 2), "utf8");

    const completed = updatePageGenerationJob(job.id, {
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      spentUsd: costBreakdown.totalUsd,
      pageData,
      renderedHtmlPath: htmlPath,
      renderedHtmlUrl: pathToFileUrl(htmlPath),
      warnings: metadata.warnings,
    });
    notify(completed);
    return completed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const budgetExceeded = err instanceof BudgetExceededError;
    const failed = updatePageGenerationJob(job.id, {
      status: "FAILED",
      errorMessage: message,
      completedAt: new Date().toISOString(),
      warnings: [
        ...(getPageGenerationJob(job.id)?.warnings ?? []),
        ...(budgetExceeded ? ["budget exceeded — pipeline aborted"] : []),
      ],
    });
    notify(failed);
    return failed;
  }
}
