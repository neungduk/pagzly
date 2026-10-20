"use client";

import { useState } from "react";
import { decodeSpec, encodeSpec, resolveStylePack } from "@/lib/style-packs";
import { INFO_LABEL, INFO_LEVELS, type InfoLevel } from "@/lib/info-style";
import { CLASSIC_PACK } from "@/lib/style-packs";

/** 413차 — 디렉터가 고른 추천과 후보(코드·라벨). 패션 세션에서만 넘어온다 */
export type StyleRecommendation = { code: string; label: string; candidates: Array<{ code: string; label: string }> };

/**
 * 결과 화면 "스타일" 선택칸(패션만).
 *  - 처음에는 한 줄: 현재 스타일(추천이면 "추천 스타일: …")과 "다른 스타일 보기" 버튼.
 *  - 누르면 추천 후보 4개 + "기본(클래식)" 칩이 나온다. 고르면 미리보기·저장·export·PNG가 같은 스타일로 바뀐다(재생성·API 호출 0건).
 * 칩은 라디오(aria-checked)이고 방향키로 옮겨 선택할 수 있다.
 */
export default function StylePackPicker({
  category,
  value,
  recommendation,
  onChange,
}: {
  category: string;
  /** 지금 적용된 스타일 id(프리셋 id 또는 스펙 코드) */
  value?: string | null;
  recommendation: StyleRecommendation | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!recommendation) return null;
  const idOf = (code: string) => resolveStylePack(category, code).id;
  const current = resolveStylePack(category, value).id;
  const recId = idOf(recommendation.code);
  const seen = new Map<string, number>();
  const chips = recommendation.candidates.map((c) => {
    const n = (seen.get(c.label) ?? 0) + 1;
    seen.set(c.label, n);
    return { id: idOf(c.code), label: n > 1 ? `${c.label} (${n})` : c.label };
  });
  chips.push({ id: CLASSIC_PACK.id, label: "기본(클래식)" });
  if (!chips.some((c) => c.id === current)) chips.unshift({ id: current, label: resolveStylePack(category, current).label });
  const currentLabel = current === recId ? `추천 스타일: ${recommendation.label}` : `스타일: ${chips.find((c) => c.id === current)?.label ?? "기본(클래식)"}`;

  function onKey(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = (i + step + chips.length) % chips.length;
    onChange(chips[next]!.id);
    const group = e.currentTarget.parentElement;
    (group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next])?.focus();
  }

  // 415차 — 인포 구간(사용 단계·포인트 카드·혼방 막대·비교표·세탁 관리) 강도. 조합 스타일(스펙 코드)일 때만
  const currentAxes = current.startsWith("x:") ? decodeSpec(current) : null;

  return (
    <div className="mb-3" data-testid="style-pack-picker">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-semibold text-ink/60" data-testid="style-pack-current">
          {currentLabel}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="style-pack-chips"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition-colors hover:border-ink/40"
        >
          {open ? "접기" : "다른 스타일 보기"}
        </button>
      </div>
      {open ? (
        <div id="style-pack-chips" role="radiogroup" aria-label="스타일" className="mt-2 flex flex-wrap items-center gap-2">
          {chips.map((c, i) => (
            <button
              key={c.id + i}
              type="button"
              role="radio"
              aria-checked={current === c.id}
              tabIndex={current === c.id || (!chips.some((x) => x.id === current) && i === 0) ? 0 : -1}
              onClick={() => onChange(c.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                current === c.id ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink/70 hover:border-ink/40"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
      {open && currentAxes ? (
        <div role="radiogroup" aria-label="설명 구간 강도" className="mt-2 flex flex-wrap items-center gap-2" data-testid="info-level-picker">
          <span className="text-xs font-semibold text-ink/60">설명 구간</span>
          {INFO_LEVELS.map((lv: InfoLevel) => (
            <button
              key={lv}
              type="button"
              role="radio"
              aria-checked={currentAxes.info === lv}
              onClick={() => onChange(encodeSpec({ ...currentAxes, info: lv }))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                currentAxes.info === lv ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink/70 hover:border-ink/40"
              }`}
            >
              {INFO_LABEL[lv]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
