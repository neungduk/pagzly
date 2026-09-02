"use client";

import type { GenerationPipelineSummary } from "@/lib/generation-pipeline-summary";

type GenerationPipelineSummaryCardProps = {
  summary: GenerationPipelineSummary;
};

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function GenerationPipelineSummaryCard({
  summary,
}: GenerationPipelineSummaryCardProps) {
  const doneCount = summary.steps.filter((s) => s.done).length;
  if (doneCount === 0) return null;

  return (
    <div
      className="rounded-xl border border-line bg-line/10 p-3"
      data-testid="pipeline-summary-card"
    >
      <p className="text-xs font-semibold text-ink">생성 단계</p>
      <p className="mt-0.5 text-[11px] text-ink/50">
        {doneCount}/{summary.steps.length}단계 완료
      </p>
      <ul className="mt-3 space-y-2">
        {summary.steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                step.done ? "bg-ink text-paper" : "border border-line bg-paper text-ink/25"
              }`}
              aria-hidden="true"
            >
              {step.done ? <CheckIcon /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${step.done ? "text-ink" : "text-ink/40"}`}>
                {step.label}
              </p>
              {step.detail ? (
                <p className="truncate text-[10px] text-ink/45">{step.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
