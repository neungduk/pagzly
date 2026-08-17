import CropMarks from "@/components/CropMarks";

// 히어로 우측의 "인화지" 스타일 파이프라인 설명 카드.
// 실제 상품 사진 대신 추상화된 다이어그램으로 표현한다 (특정 브랜드의
// 실제 상품 사진을 마케팅 자료에 무단으로 쓰지 않기 위함).
export default function PipelineCard() {
  return (
    <div className="pagzly-pipeline-float relative rotate-1 border border-line bg-white p-5 shadow-[6px_6px_0_0_#DAD5C9] sm:p-6">
      <CropMarks />

      {/* RAW INPUT */}
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
        01 · Raw Input
      </p>
      <div className="mt-2 flex aspect-[4/5] items-center justify-center border border-line bg-[repeating-linear-gradient(135deg,theme(colors.line/40%),theme(colors.line/40%)_1px,transparent_1px,transparent_10px)]">
        <svg
          viewBox="0 0 48 48"
          className="h-12 w-12 text-ink/30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="14" y="6" width="20" height="36" rx="2" />
          <path d="M14 16h20" />
          <circle cx="24" cy="27" r="5" />
        </svg>
      </div>

      {/* COLOR EXTRACT — accent / base / deep 스와치 (히어로 핵심 시각 요소) */}
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
        02 · Color Extract
      </p>
      <div className="mt-3 flex items-center justify-center gap-5 border border-line bg-paper/50 py-6 sm:gap-8 sm:py-8">
        <div className="flex flex-col items-center gap-2">
          <span className="h-14 w-14 rounded-full bg-mustard shadow-[0_4px_16px_rgba(227,167,46,0.35)] ring-2 ring-paper sm:h-16 sm:w-16" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-mustard">
            Accent
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="h-14 w-14 rounded-full border-2 border-line bg-paper shadow-[0_4px_14px_rgba(27,27,24,0.08)] ring-2 ring-white sm:h-16 sm:w-16" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/50">
            Base
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="h-14 w-14 rounded-full bg-slate-blue shadow-[0_4px_16px_rgba(47,72,88,0.35)] ring-2 ring-paper sm:h-16 sm:w-16" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-blue">
            Deep
          </span>
        </div>
      </div>

      {/* GENERATED */}
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-registration-red">
        03 · Generated
      </p>
      <div className="mt-2 space-y-1.5 border border-line p-3">
        <div className="h-8 w-full bg-ink" />
        <div className="h-3 w-3/4 bg-line" />
        <div className="h-3 w-1/2 bg-line" />
        <div className="h-10 w-full bg-mustard/30" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-1/3 bg-line" />
          <span className="font-mono text-[9px] font-semibold text-registration-red">
            ₩32,900
          </span>
        </div>
      </div>
    </div>
  );
}
