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
} from "@/components/GeneratingOverlay";
import {
  DRAFT_SESSION_KEY,
  SESSION_KEY,
  type DraftSessionPayload,
} from "@/components/CreateProductForm";
import {
  runPhotoEnhancementPipeline,
  type UploadedImage,
} from "@/lib/photo-pipeline-client";
import { getSectionAidaPhase } from "@/lib/section-aida";
import type { DetailSection, GenerateResponse } from "@/lib/types/generate";


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

export default function CreateDraftPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftSessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<"idle" | GeneratingStage>("idle");
  const [overlaySnap, setOverlaySnap] = useState(false);
  const [backdropCandidates, setBackdropCandidates] = useState<string[] | null>(null);
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
    setLoadingStage("generating");
    setOverlaySnap(false);
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
    }
  }

  async function handleApproveAndFinalize() {
    if (!draft) return;
    setError(null);
    setOverlaySnap(false);

    try {
      const urls = (draft.payload.imageUrls as string[]) ?? [];
      const paths = (draft.payload.imagePaths as string[]) ?? [];
      const uploaded: UploadedImage[] = urls.map((url, i) => ({
        url,
        path: paths[i] ?? `draft/${i}`,
      }));

      if (uploaded.length === 0) {
        throw new Error("원본 이미지가 없습니다. 처음부터 다시 생성해 주세요.");
      }

      const snap = draft.formSnapshot;
      const photo = await runPhotoEnhancementPipeline({
        uploaded,
        category: snap.category,
        productName: snap.productName,
        brandName: snap.brandName || null,
        price: Number(snap.price) || Number(draft.payload.price) || 0,
        keyFeatures: snap.keyFeatures || null,
        ingredients: snap.ingredients || null,
        targetCustomer: snap.targetCustomer || null,
        referenceImageUrl: (draft.payload.referenceImageUrl as string | null) ?? null,
        pickBackdrop: waitForBackdropPick,
        onStage: (stage) => setLoadingStage(stage),
      });

      const enhancedImages = photo?.images ?? uploaded;
      const photoProcessingCost = photo?.photoProcessingCost ?? 0;
      const photoCostBreakdown = {
        ...(draft.photoCostBreakdown ?? {}),
        ...(photo?.photoCostBreakdown ?? {}),
      };

      setLoadingStage("generating");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft.payload,
          mode: "final",
          imageUrls: enhancedImages.map((i) => i.url),
          imagePaths: enhancedImages.map((i) => i.path),
          photoProcessingCost:
            ((draft.payload.photoProcessingCost as number) ?? 0) + photoProcessingCost,
          photoCostBreakdown,
          conceptBrief: photo?.conceptBrief ?? draft.payload.conceptBrief,
          referenceAnalysis: photo?.referenceAnalysis ?? draft.payload.referenceAnalysis,
          draftSections: draft.sections,
          draftHeadlines: draft.headlines,
          draftDescription: draft.description,
          draftFeatures: draft.features,
          draftHowToUse: draft.howToUse,
          draftCaution: draft.caution,
          draftToken: draft.draftToken,
        }),
      });
      const json = (await res.json()) as GenerateResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "최종 생성에 실패했습니다.");

      setOverlaySnap(true);
      await new Promise((r) => setTimeout(r, SNAP_HOLD_MS));

      persistDraft({ ...draft, draftApproved: true });

      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            ...draft.payload,
            imageUrls: json.imageUrls ?? enhancedImages.map((i) => i.url),
            photoCostBreakdown: json.photoCostBreakdown ?? photoCostBreakdown,
            referenceAnalysis: json.referenceAnalysis ?? draft.referenceAnalysis,
            reviewInsights: json.reviewInsights ?? draft.reviewInsights ?? null,
            planningDocText: json.planningDocText ?? draft.planningDocText ?? null,
            testMode: json.testMode ?? photo?.testMode,
            generated: json,
            draftApproved: true,
          }),
        );
      } catch (storageError) {
        // 세션 캐시 저장 실패해도 서버 생성은 이미 끝났음 — 결과 페이지의 DB 폴백으로 복구됨.
        console.warn("[create/draft] sessionStorage 저장 실패 — DB 폴백으로 진행", storageError);
      }

      router.push(`/create/result?id=${encodeURIComponent(json.productId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "최종 생성 중 오류가 발생했습니다.");
      setLoadingStage("idle");
      setOverlaySnap(false);
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

        {error && (
          <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
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
            disabled={busy}
            onClick={() => void handleApproveAndFinalize()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-registration-red px-5 text-sm font-semibold text-paper transition-colors hover:bg-registration-red/90 disabled:opacity-50"
          >
            승인하고 최종 생성
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
        />
      )}
      {backdropCandidates && (
        <BackdropCandidatePicker
          urls={backdropCandidates}
          onConfirm={(url) => {
            const resolve = backdropPickRef.current;
            backdropPickRef.current = null;
            setBackdropCandidates(null);
            resolve?.(url);
          }}
        />
      )}
    </div>
  );
}
