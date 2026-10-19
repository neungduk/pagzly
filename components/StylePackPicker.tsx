"use client";

import { resolveStylePack, stylePackOptions } from "@/lib/style-packs";

/**
 * 408차 — 결과 화면 "스타일" 선택칸. 패션에서만 보인다(다른 카테고리는 선택지가 없어 null).
 * 고르면 같은 결과를 다른 팩으로 다시 그린다(표시 단계만, 재생성·유료 호출 없음).
 */
export default function StylePackPicker({
  category,
  value,
  onChange,
}: {
  category: string;
  value?: string | null;
  onChange: (id: string) => void;
}) {
  const options = stylePackOptions(category);
  if (options.length < 2) return null;
  const current = resolveStylePack(category, value).id;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1" role="radiogroup" aria-label="스타일" data-testid="style-pack-picker">
      <span className="text-xs font-semibold text-ink/60">스타일</span>
      {options.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={current === p.id}
          title={p.blurb}
          onClick={() => onChange(p.id)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            current === p.id ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink/70 hover:border-ink/40"
          }`}
        >
          {p.label}
        </button>
      ))}
      <span className="w-full text-[11px] text-ink/50 sm:w-auto" data-testid="style-pack-short">
        {options.find((p) => p.id === current)?.short}
      </span>
    </div>
  );
}
