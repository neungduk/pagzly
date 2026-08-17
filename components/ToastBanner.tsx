"use client";

type ToastBannerProps = {
  message: string;
  tone?: "error" | "info" | "ok";
  onDismiss?: () => void;
};

export default function ToastBanner({
  message,
  tone = "info",
  onDismiss,
}: ToastBannerProps) {
  const toneClass =
    tone === "error"
      ? "bg-red-50 text-red-700"
      : tone === "ok"
        ? "bg-emerald-50 text-emerald-800"
        : "bg-ink/90 text-paper";

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm shadow-lg ${toneClass}`}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1">{message}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-xs opacity-70 hover:opacity-100"
          >
            닫기
          </button>
        )}
      </div>
    </div>
  );
}
