"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import GeneratingOverlay, {
  type GeneratingStage,
} from "@/components/GeneratingOverlay";

const STAGES: GeneratingStage[] = [
  "uploading",
  "backdrop",
  "enhancing",
  "generating",
];

/**
 * 생성 중 오버레이 시각 검증용 (인증 불필요).
 * /dev/generating-overlay?snapAt=4 → 4초 후 snapComplete
 */
export default function GeneratingOverlayPreviewPage() {
  const [stageIndex, setStageIndex] = useState(0);
  const [snapComplete, setSnapComplete] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const params = new URLSearchParams(window.location.search);
    const snapAt = Number(params.get("snapAt") ?? "5");
    const stageTimer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 2500);
    const snapTimer = setTimeout(() => setSnapComplete(true), snapAt * 1000);
    return () => {
      clearInterval(stageTimer);
      clearTimeout(snapTimer);
    };
  }, []);

  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <GeneratingOverlay
      stage={STAGES[stageIndex]}
      category="화장품/뷰티"
      productName="오버레이 테스트 앰플"
      snapComplete={snapComplete}
    />
  );
}
