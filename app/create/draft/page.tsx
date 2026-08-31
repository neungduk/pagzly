"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackdropCandidatePicker from "@/components/BackdropCandidatePicker";
import CropMarks from "@/components/CropMarks";
import GeneratingOverlay, {
  slotDisplayLabel,
  SNAP_HOLD_MS,
  type GeneratingStage,
  type OverlayProgressState,
} from "@/components/GeneratingOverlay";
import {
  DRAFT_SESSION_KEY,
  RETRY_PHOTO_ONLY_KEY,
  SESSION_KEY,
  type DraftSessionPayload,
} from "@/components/CreateProductForm";
import {
  runPhotoEnhancementPipeline,
  type PhotoPipelineProgressEvent,
  type UploadedImage,
} from "@/lib/photo-pipeline-client";
import { getSectionAidaPhase } from "@/lib/section-aida";
import type { DetailSection, GenerateResponse, PhotoCostBreakdown } from "@/lib/types/generate";

function sectionPreviewText(section: DetailSection): string {
  switch (section.type) {
    case "hero":
      return [section.headline, section.subheadline].filter(Boolean).join(" — ");
    case "checklist":
      return section.items.slice(0, 4).map((item) => `· ${item}`).join("\n");
    case "usage_steps":
      return section.steps.slice(0, 4).map((step, i) => `${i + 1}. ${step}`).join("\n");
    case "faq":
      return section.items
        .slice(0, 3)
        .map((item) => `Q. ${item.question}`)
        .join("\n");
    case "target_persona":
      return section.personas.slice(0, 5).map((p) => `· ${p}`).join("\n");
    case "spec_table":
    case "comparison_table":
      return section.rows
        .slice(0, 4)
        .map((row) => {
          if ("value" in row) return `${row.label}: ${row.value}`;
          return `${row.label}: ${row.values.join(" / ")}`;
        })
        .join("\n");
    case "stat_infographic":
      return section.metrics
        .slice(0, 4)
        .map((m) => `${m.label} ${m.value}`)
        .join(" · ");
    case "highlight_box":
      return section.cards
        .slice(0, 3)
        .map((c) => `· ${c.title}`)
        .join("\n");
    case "step_card":
      return section.steps
        .slice(0, 3)
        .map((s, i) => `${i + 1}. ${s.title}`)
        .join("\n");
    case "cta_price":
      return `₩${Number(section.price).toLocaleString("ko-KR")}${
        section.targetCustomer ? ` · ${section.targetCustomer}` : ""
      }`;
    case "gallery":
    case "color_variation":
      return section.heading;
    case "image_text":
    case "caution":
    case "brand_story":
    case "ai_disclosure":
    case "illustration_banner":
      return [section.heading, "body" in section ? section.body : undefined]
        .filter(Boolean)
        .join("\n");
    default:
      return "";
  }
}

function sectionHeading(section: DetailSection): string {
  if (section.type === "hero") return section.headline;
  if ("heading" in section && section.heading) return section.heading;
  return slotDisplayLabel(section.slot, section.slot);
}

type PhotoPendingState = {
  draftAfterEnhance: DraftSessionPayload;
  enhancedImages: UploadedImage[];
  photoProcessingCost: number;
  photoCostBreakdown: PhotoCostBreakdown;
  warning: string;
  testMode: boolean;
};

function mapProgressToStage(event: PhotoPipelineProgressEvent): GeneratingStage {
  if (event.stage === "generating") return "generating";
  if (event.stage === "enhancing" || event.stage === "lifestyle") return "enhancing";
  return "backdrop";
}

function mapProgressToOverlay(event: PhotoPipelineProgressEvent): OverlayProgressState {
  return {
    detail: event.detail,
    current: event.current,
    total: event.total,
    elapsedMs: event.elapsedMs,
    costUsdSoFar: event.costUsdSoFar,
    retrying: event.retrying,
  };
}

export default function CreateDraftPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftSessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<"idle" | GeneratingStage>("idle");
  const [overlaySnap, setOverlaySnap] = useState(false);
  const [overlayProgress, setOverlayProgress] = useState<OverlayProgressState | undefined>();
  const [backdropCandidates, setBackdropCandidates] = useState<string[] | null>(null);
  const [photoPending, setPhotoPending] = useState<PhotoPendingState | null>(null);
  const [retryPhotoOnly, setRetryPhotoOnly] = useState(false);
  const backdropPickRef = useRef<((url: string) => void) | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_SESSION_KEY);
      if (!raw) {
        router.replace("/create");
        return;
      }
      const parsed = JSON.parse(raw) as DraftSessionPayload;
      if (parsed.draftApproved === undefined) {
        parsed.draftApproved = false;
      }
      setDraft(parsed);
      setRetryPhotoOnly(sessionStorage.getItem(RETRY_PHOTO_ONLY_KEY) === "1");
    } catch {
      router.replace("/create");
    }
  }, [router]);

  const sectionCount = draft?.sections.length ?? 0;

  const category = useMemo(
    () => String(draft?.payload.category ?? draft?.formSnapshot.category ?? ""),
    [draft],
  );
  const productName = useMemo(
    () => String(draft?.payload.productName ?? draft?.formSnapshot.productName ?? ""),
    [draft],
  );

  const persistDraft = useCallback((next: DraftSessionPayload) => {
    setDraft(next);
    sessionStorage.setItem(DRAFT_SESSION_KEY, JSON.stringify(next));
  }, []);

  function waitForBackdropPick(urls: string[]): Promise<string> {
    return new Promise((resolve) => {
      backdropPickRef.current = resolve;
      setBackdropCandidates(urls);
      setLoadingStage("idle");
    });
  }

  async function handleRegenerate() {
    if (!draft) return;
    setError(null);
    setPhotoPending(null);
    setLoadingStage("generating");
    setOverlaySnap(false);
    setOverlayProgress(undefined);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft.payload,
          mode: "draft",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "재생성에 실패했습니다.");

      setOverlaySnap(true);
      await new Promise((r) => setTimeout(r, SNAP_HOLD_MS));

      persistDraft({
        ...draft,
        payload: {
          ...draft.payload,
          imageUrls: json.imageUrls ?? draft.payload.imageUrls,
          photoCostBreakdown: json.photoCostBreakdown ?? draft.payload.photoCostBreakdown,
          referenceAnalysis: json.referenceAnalysis ?? draft.payload.referenceAnalysis,
          reviewInsights: json.reviewInsights ?? null,
          planningDocText: json.planningDocText ?? null,
          competitorDifferentiation: json.competitorDifferentiation ?? null,
        },
        draftToken: json.draftToken,
        sections: json.sections,
        headlines: json.headlines ?? [],
        description: json.description ?? "",
        features: json.features ?? [],
        howToUse: json.howToUse ?? "",
        caution: json.caution ?? "",
        imageAnalysis: json.imageAnalysis,
        theme: json.theme,
        mfdsReviewed: json.mfdsReviewed,
        replacements: json.replacements,
        photoCostBreakdown: json.photoCostBreakdown,
        referenceAnalysis: json.referenceAnalysis,
        reviewInsights: json.reviewInsights,
        planningDocText: json.planningDocText,
        competitorDifferentiation: json.competitorDifferentiation,
        draftApproved: false,
      });
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          ...draft.payload,
          imageUrls: json.imageUrls ?? draft.payload.imageUrls,
          generated: {
            sections: json.sections,
            headlines: json.headlines ?? [],
            description: json.description ?? "",
            features: json.features ?? [],
            howToUse: json.howToUse ?? "",
            caution: json.caution ?? "",
            imageAnalysis: json.imageAnalysis,
            theme: json.theme,
            mfdsReviewed: json.mfdsReviewed,
            replacements: json.replacements,
            draftToken: json.draftToken,
          },
          draftApproved: false,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "재생성 중 오류가 발생했습니다.");
    } finally {
      setLoadingStage("idle");
      setOverlaySnap(false);
      setOverlayProgress(undefined);
    }
  }

  async function runPhotoPhase(currentDraft: DraftSessionPayload) {
    const urls = (currentDraft.payload.imageUrls as string[]) ?? [];
    const paths = (currentDraft.payload.imagePaths as string[]) ?? [];
    const uploaded: UploadedImage[] = urls.map((url, i) => ({
      url,
      path: paths[i] ?? `draft/${i}`,
    }));

    if (uploaded.length === 0) {
      throw new Error("원본 이미지가 없습니다. 처음부터 다시 생성해 주세요.");
    }

    try {
      await fetch("/api/protect-product-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePaths: paths.filter(Boolean) }),
      });
    } catch (protectErr) {
      console.warn("[create/draft] protect-product-images 실패 — 생성은 계속", protectErr);
    }

    const snap = currentDraft.formSnapshot;
    setLoadingStage("backdrop");
    setOverlayProgress(undefined);

    const photo = await runPhotoEnhancementPipeline({
      uploaded,
      category: snap.category,
      productName: snap.productName,
      brandName: snap.brandName || null,
      price: Number(snap.price) || Number(currentDraft.payload.price) || 0,
      keyFeatures: snap.keyFeatures || null,
      ingredients: snap.ingredients || null,
      targetCustomer: snap.targetCustomer || null,
      referenceImageUrl: (currentDraft.payload.referenceImageUrl as string | null) ?? null,
      draftToken: currentDraft.draftToken,
      pickBackdrop: waitForBackdropPick,
      onStage: (event) => {
        setLoadingStage(mapProgressToStage(event));
        setOverlayProgress(mapProgressToOverlay(event));
      },
    });

    const enhancedImages = photo.images;
    const photoProcessingCost = photo.photoProcessingCost ?? 0;
    const photoCostBreakdown = {
      ...(currentDraft.photoCostBreakdown ?? {}),
      ...(photo.photoCostBreakdown ?? {}),
    };

    const draftAfterEnhance: DraftSessionPayload = {
      ...currentDraft,
      payload: {
        ...currentDraft.payload,
        imageUrls: enhancedImages.map((i) => i.url),
        imagePaths: enhancedImages.map((i) => i.path),
        imageRoles: (() => {
          const prev = (currentDraft.payload.imageRoles as string[] | undefined) ?? [];
          const roles = [...prev];
          while (roles.length < enhancedImages.length) {
            roles.push("lifestyle");
          }
          return roles.slice(0, enhancedImages.length);
        })(),
        photoProcessingCost:
          ((currentDraft.payload.photoProcessingCost as number) ?? 0) + photoProcessingCost,
        photoCostBreakdown,
        conceptBrief: photo.conceptBrief ?? currentDraft.payload.conceptBrief,
        referenceAnalysis: photo.referenceAnalysis ?? currentDraft.payload.referenceAnalysis,
        backdropFailed: photo.backdropFailed ?? false,
      },
      photoCostBreakdown,
      referenceAnalysis: photo.referenceAnalysis ?? currentDraft.referenceAnalysis,
    };
    persistDraft(draftAfterEnhance);

    return {
      draftAfterEnhance,
      enhancedImages,
      photoProcessingCost,
      photoCostBreakdown,
      testMode: photo.testMode,
      backdropFailed: photo.backdropFailed,
      warning: photo.warning,
      conceptBrief: photo.conceptBrief,
      referenceAnalysis: photo.referenceAnalysis,
    };
  }

  async function runFinalPhase(params: {
    draftAfterEnhance: DraftSessionPayload;
    enhancedImages: UploadedImage[];
    photoCostBreakdown: PhotoCostBreakdown;
    testMode: boolean;
    conceptBrief?: DraftSessionPayload["payload"]["conceptBrief"];
    referenceAnalysis?: DraftSessionPayload["referenceAnalysis"];
  }) {
    const {
      draftAfterEnhance,
      enhancedImages,
      photoCostBreakdown,
      testMode,
      conceptBrief,
      referenceAnalysis,
    } = params;

    setLoadingStage("generating");
    setOverlayProgress({ detail: "상세페이지 조립 중" });

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draftAfterEnhance.payload,
        mode: "final",
        imageUrls: enhancedImages.map((i) => i.url),
        imagePaths: enhancedImages.map((i) => i.path),
        photoProcessingCost: draftAfterEnhance.payload.photoProcessingCost,
        photoCostBreakdown,
        conceptBrief: conceptBrief ?? draftAfterEnhance.payload.conceptBrief,
        referenceAnalysis: referenceAnalysis ?? draftAfterEnhance.payload.referenceAnalysis,
        draftSections: draftAfterEnhance.sections,
        draftHeadlines: draftAfterEnhance.headlines,
        draftDescription: draftAfterEnhance.description,
        draftFeatures: draftAfterEnhance.features,
        draftHowToUse: draftAfterEnhance.howToUse,
        draftCaution: draftAfterEnhance.caution,
        draftToken: draftAfterEnhance.draftToken,
      }),
    });
    const json = (await res.json()) as GenerateResponse & {
      error?: string;
      balance?: number;
      required?: number;
    };
    if (!res.ok) {
      if (res.status === 402 && json.error === "insufficient_credits") {
        const balance = json.balance ?? 0;
        const required = json.required;
        throw new Error(
          required != null
            ? `토큰이 부족합니다 (필요 ${required.toLocaleString("ko-KR")} / 보유 ${balance.toLocaleString("ko-KR")})`
            : "토큰이 부족합니다. 토큰을 충전한 뒤 다시 시도해 주세요.",
        );
      }
      throw new Error(json.error ?? "최종 생성에 실패했습니다.");
    }

    setOverlaySnap(true);
    await new Promise((r) => setTimeout(r, SNAP_HOLD_MS));

    persistDraft({ ...draftAfterEnhance, draftApproved: true });
    sessionStorage.removeItem(RETRY_PHOTO_ONLY_KEY);
    setRetryPhotoOnly(false);

    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          ...draftAfterEnhance.payload,
          imageUrls: json.imageUrls ?? enhancedImages.map((i) => i.url),
          photoCostBreakdown: json.photoCostBreakdown ?? photoCostBreakdown,
          photoProcessingCost: draftAfterEnhance.payload.photoProcessingCost,
          generationCost: json.generationCost,
          referenceAnalysis: json.referenceAnalysis ?? draftAfterEnhance.referenceAnalysis,
          reviewInsights: json.reviewInsights ?? draftAfterEnhance.reviewInsights ?? null,
          planningDocText: json.planningDocText ?? draftAfterEnhance.planningDocText ?? null,
          competitorDifferentiation:
            json.competitorDifferentiation ?? draftAfterEnhance.competitorDifferentiation ?? null,
          testMode: json.testMode ?? testMode,
          backdropFailed: draftAfterEnhance.payload.backdropFailed ?? false,
          generated: json,
          draftApproved: true,
        }),
      );
    } catch (storageError) {
      console.warn("[create/draft] sessionStorage 저장 실패 — DB 폴백으로 진행", storageError);
    }

    router.push(`/create/result?id=${encodeURIComponent(json.productId)}`);
  }

  async function handleApproveAndFinalize() {
    if (!draft) return;
    setError(null);
    setPhotoPending(null);
    setOverlaySnap(false);
    setOverlayProgress(undefined);

    try {
      const photoResult = await runPhotoPhase(draft);

      if (photoResult.backdropFailed || photoResult.warning) {
        setPhotoPending({
          draftAfterEnhance: photoResult.draftAfterEnhance,
          enhancedImages: photoResult.enhancedImages,
          photoProcessingCost: photoResult.photoProcessingCost,
          photoCostBreakdown: photoResult.photoCostBreakdown,
          warning: photoResult.warning ?? "배경 생성에 실패해 원본 사진으로 계속합니다.",
          testMode: photoResult.testMode,
        });
        setLoadingStage("idle");
        setOverlayProgress(undefined);
        return;
      }

      await runFinalPhase({
        draftAfterEnhance: photoResult.draftAfterEnhance,
        enhancedImages: photoResult.enhancedImages,
        photoCostBreakdown: photoResult.photoCostBreakdown,
        testMode: photoResult.testMode,
        conceptBrief: photoResult.conceptBrief,
        referenceAnalysis: photoResult.referenceAnalysis,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "최종 생성 중 오류가 발생했습니다.");
      setLoadingStage("idle");
      setOverlaySnap(false);
      setOverlayProgress(undefined);
    }
  }

  async function handleRetryPhotoOnly() {
    if (!draft) return;
    setPhotoPending(null);
    setError(null);
    setOverlaySnap(false);
    try {
      const photoResult = await runPhotoPhase(draft);
      if (photoResult.backdropFailed || photoResult.warning) {
        setPhotoPending({
          draftAfterEnhance: photoResult.draftAfterEnhance,
          enhancedImages: photoResult.enhancedImages,
          photoProcessingCost: photoResult.photoProcessingCost,
          photoCostBreakdown: photoResult.photoCostBreakdown,
          warning: photoResult.warning ?? "배경 생성에 실패했습니다.",
          testMode: photoResult.testMode,
        });
        setLoadingStage("idle");
        return;
      }
      await runFinalPhase({
        draftAfterEnhance: photoResult.draftAfterEnhance,
        enhancedImages: photoResult.enhancedImages,
        photoCostBreakdown: photoResult.photoCostBreakdown,
        testMode: photoResult.testMode,
        conceptBrief: photoResult.conceptBrief,
        referenceAnalysis: photoResult.referenceAnalysis,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 보정 재시도 중 오류가 발생했습니다.");
      setLoadingStage("idle");
    }
  }

  async function handleContinueWithOriginals() {
    if (!photoPending) return;
    setError(null);
    try {
      await runFinalPhase({
        draftAfterEnhance: photoPending.draftAfterEnhance,
        enhancedImages: photoPending.enhancedImages,
        photoCostBreakdown: photoPending.photoCostBreakdown,
        testMode: photoPending.testMode,
      });
      setPhotoPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "최종 생성 중 오류가 발생했습니다.");
      setLoadingStage("idle");
    }
  }

  if (!draft) {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper p-10 text-sm text-ink/50">
        기획 초안 불러오는 중…
      </div>
    );
  }

  const busy = loadingStage !== "idle" || backdropCandidates !== null;

  return (
    <div className="min-h-full bg-paper text-ink">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-line/40 to-paper" />

      <main className="mx-auto max-w-3xl px-6 py-10 pb-28">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-registration-red">
            Draft
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-ink sm:text-3xl">
            기획 초안
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            카피 구성을 확인한 뒤 승인하면 이미지 보정·최종 조립이 진행됩니다. (승인 전 배경 생성
            비용 없음)
          </p>
          {retryPhotoOnly && (
            <p className="mt-3 rounded-lg border border-mustard/40 bg-mustard/10 px-4 py-2 text-sm text-ink/75">
              배경·보정만 다시 시도합니다. 승인하면 사진 파이프라인부터 재실행됩니다.
            </p>
          )}
        </div>

        <div className="relative mb-8 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
          <CropMarks />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
                Input summary
              </p>
              <p className="mt-2 font-heading text-xl font-bold tracking-[-0.02em]">{productName}</p>
              <p className="mt-1 text-sm text-ink/55">{category}</p>
              <p className="mt-2 font-mono text-[10px] text-ink/40">
                {draft.draftApproved ? "승인됨 · 최종 생성 진행" : "원본 이미지 · 카피만 생성됨"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/create?restore=1"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-line/30"
              >
                수정
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRegenerate()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-ink/20 bg-ink px-4 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
              >
                다시 생성
              </button>
            </div>
          </div>

          {Array.isArray(draft.payload.imageUrls) &&
            (draft.payload.imageUrls as string[]).length > 0 && (
              <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                {(draft.payload.imageUrls as string[]).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg border border-line object-cover"
                  />
                ))}
              </div>
            )}
        </div>

        {(draft.reviewInsights ||
          draft.referenceAnalysis ||
          draft.competitorDifferentiation) &&
          ((draft.referenceAnalysis?.colorHex?.length ?? 0) > 0 ||
            (draft.referenceAnalysis?.moodKeywords?.length ?? 0) > 0 ||
            (draft.reviewInsights?.commonPraises?.length ?? 0) > 0 ||
            (draft.reviewInsights?.commonComplaints?.length ?? 0) > 0 ||
            (draft.competitorDifferentiation?.competitorFocus?.length ?? 0) > 0 ||
            (draft.competitorDifferentiation?.differentiationHints?.length ?? 0) > 0) && (
            <div className="relative mb-8 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
              <CropMarks color="text-line/80" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
                Reference analysis
              </p>
              <p className="mt-1 text-xs text-ink/50">
                업로드하신 참고 자료를 AI가 이렇게 읽고 반영했습니다.
              </p>

              {((draft.referenceAnalysis?.colorHex?.length ?? 0) > 0 ||
                (draft.referenceAnalysis?.moodKeywords?.length ?? 0) > 0) && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-ink">레퍼런스 이미지 · 색감/무드</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {draft.referenceAnalysis?.colorHex?.map((hex) => (
                      <span
                        key={hex}
                        className="h-6 w-6 rounded-full border border-line"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                    {draft.referenceAnalysis?.moodKeywords?.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md bg-line/40 px-2 py-0.5 text-xs text-ink/70"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {((draft.reviewInsights?.commonPraises?.length ?? 0) > 0 ||
                (draft.reviewInsights?.commonComplaints?.length ?? 0) > 0) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(draft.reviewInsights?.commonPraises?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink">자주 언급된 장점</p>
                      <ul className="mt-1 space-y-1 text-sm text-ink/70">
                        {draft.reviewInsights?.commonPraises.map((p) => (
                          <li key={p}>· {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(draft.reviewInsights?.commonComplaints?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink">자주 언급된 아쉬운 점</p>
                      <ul className="mt-1 space-y-1 text-sm text-ink/70">
                        {draft.reviewInsights?.commonComplaints.map((c) => (
                          <li key={c}>· {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {((draft.competitorDifferentiation?.competitorFocus?.length ?? 0) > 0 ||
                (draft.competitorDifferentiation?.differentiationHints?.length ?? 0) > 0) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(draft.competitorDifferentiation?.competitorFocus?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink">경쟁 페이지가 강조하는 포인트</p>
                      <ul className="mt-1 space-y-1 text-sm text-ink/70">
                        {draft.competitorDifferentiation?.competitorFocus.map((p) => (
                          <li key={p}>· {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(draft.competitorDifferentiation?.differentiationHints?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink">우리 상품이 다르게 어필할 수 있는 지점</p>
                      <ul className="mt-1 space-y-1 text-sm text-ink/70">
                        {draft.competitorDifferentiation?.differentiationHints.map((h) => (
                          <li key={h}>· {h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {photoPending && (
          <div className="mb-6 space-y-3 rounded-xl border border-mustard/40 bg-mustard/10 px-4 py-4 text-sm text-ink/80">
            <p className="font-medium text-ink">배경·보정 일부 실패</p>
            <p>{photoPending.warning}</p>
            <p className="text-xs text-ink/55">
              원본 사진으로도 상세페이지를 만들 수 있습니다. 배경만 다시 시도하거나 이대로 진행하세요.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRetryPhotoOnly()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-registration-red px-4 text-sm font-semibold text-paper hover:bg-registration-red/90 disabled:opacity-50"
              >
                배경·보정 다시 시도
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleContinueWithOriginals()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-paper px-4 text-sm font-medium text-ink hover:bg-line/30 disabled:opacity-50"
              >
                이대로 최종 생성
              </button>
            </div>
          </div>
        )}

        {error && !photoPending && (
          <div className="mb-6 space-y-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            <p>{error}</p>
            {/만료|다시 업로드/.test(error) ? (
              <Link
                href="/create"
                className="inline-flex font-medium text-registration-red underline-offset-2 hover:underline"
              >
                사진 다시 업로드하러 가기
              </Link>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleApproveAndFinalize()}
                className="inline-flex font-medium text-registration-red underline-offset-2 hover:underline disabled:opacity-50"
              >
                생성 다시 시도
              </button>
            )}
          </div>
        )}

        <ul className="space-y-4">
          {draft.sections.map((section, index) => {
            const label = slotDisplayLabel(section.slot, section.slot);
            const heading = sectionHeading(section);
            const body = sectionPreviewText(section);
            return (
              <li
                key={`${section.slot}-${index}`}
                className="relative rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6"
              >
                <CropMarks color="text-line/80" />
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-registration-red">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">
                    {label}
                  </span>
                  <span className="rounded-md bg-line/40 px-2 py-0.5 font-mono text-[10px] text-ink/55">
                    {getSectionAidaPhase(section.type)}
                  </span>
                </div>
                <h2 className="mt-3 font-heading text-lg font-bold tracking-[-0.02em] text-ink">
                  {heading}
                </h2>
                {body && body !== heading && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/70">
                    {body}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <p className="font-mono text-xs text-ink/50">총 섹션 {sectionCount}개</p>
          <button
            type="button"
            disabled={busy || photoPending != null}
            onClick={() => void handleApproveAndFinalize()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-registration-red px-5 text-sm font-semibold text-paper transition-colors hover:bg-registration-red/90 disabled:opacity-50"
          >
            {retryPhotoOnly ? "사진 보정 후 최종 생성" : "승인하고 최종 생성"}
          </button>
        </div>
      </div>

      {loadingStage !== "idle" && !backdropCandidates && (
        <GeneratingOverlay
          stage={loadingStage}
          category={category || "기타"}
          productName={productName || "상품"}
          length={draft.formSnapshot.compositionLength}
          snapComplete={overlaySnap}
          progress={overlayProgress}
        />
      )}
      {backdropCandidates && (
        <BackdropCandidatePicker
          urls={backdropCandidates}
          onConfirm={(url) => {
            const resolve = backdropPickRef.current;
            backdropPickRef.current = null;
            setBackdropCandidates(null);
            setLoadingStage("backdrop");
            resolve?.(url);
          }}
        />
      )}
    </div>
  );
}
