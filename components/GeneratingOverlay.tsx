export type GeneratingStage = "uploading" | "backdrop" | "enhancing" | "generating";

const STAGE_MESSAGES: Record<GeneratingStage, string> = {
  uploading: "사진 업로드 중",
  backdrop: "배경 디자인 생성 중",
  enhancing: "사진 보정 중",
  generating: "AI 상세페이지 생성 중",
};

type GeneratingOverlayProps = {
  stage: GeneratingStage;
};

function BouncingDot({ delayMs }: { delayMs: number }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 animate-bounce rounded-full bg-registration-red"
      style={{ animationDelay: `${delayMs}ms` }}
      aria-hidden="true"
    />
  );
}

export default function GeneratingOverlay({ stage }: GeneratingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="font-heading text-2xl font-bold text-ink sm:text-3xl">
        {STAGE_MESSAGES[stage]}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <BouncingDot delayMs={0} />
        <BouncingDot delayMs={150} />
        <BouncingDot delayMs={300} />
      </div>
      <p className="mt-6 text-sm text-ink/60">잠시만 기다려 주세요...</p>
    </div>
  );
}
