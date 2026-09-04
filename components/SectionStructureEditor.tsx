"use client";

import PageStructureChat from "@/components/PageStructureChat";
import { getSectionAidaShort } from "@/lib/section-aida";
import type { DetailSection } from "@/lib/types/generate";

type SectionStructureEditorProps = {
  sections: DetailSection[];
  hiddenIndexes: number[];
  onReorder: (from: number, to: number) => void;
  onToggleHidden: (index: number) => void;
  patchIndex: number;
  onPatchIndexChange: (index: number) => void;
  patchInstruction: string;
  onPatchInstructionChange: (value: string) => void;
  onPatchSubmit: () => void;
  patchLoading?: boolean;
  /** true면 순서/숨김만 (섹션 AI는 별도 탭) */
  hidePatch?: boolean;
  onAddCanvas?: () => void;
};

export default function SectionStructureEditor({
  sections,
  hiddenIndexes,
  onReorder,
  onToggleHidden,
  patchIndex,
  onPatchIndexChange,
  patchInstruction,
  onPatchInstructionChange,
  onPatchSubmit,
  patchLoading,
  hidePatch = false,
  onAddCanvas,
}: SectionStructureEditorProps) {
  const hidden = new Set(hiddenIndexes);
  const btn =
    "inline-flex h-8 items-center justify-center rounded-md border border-line px-2 text-xs font-semibold text-ink hover:bg-line/30 disabled:opacity-40";

  return (
    <div className="space-y-4" data-testid="panel-structure">
      <p className="text-xs leading-relaxed text-ink/55">
        섹션 순서를 바꾸거나 숨길 수 있습니다. 숨긴 섹션은 미리보기·PNG·HTML에서
        빠집니다.
        {!hidePatch
          ? " 아래 AI 패치로 한 섹션만 지시문 수정할 수 있습니다."
          : " 카피 AI 수정은 «섹션 AI» 탭을 이용하세요."}
      </p>

      <ul className="max-h-64 space-y-1.5 overflow-y-auto">
        {sections.map((section, index) => {
          const isHidden = hidden.has(index);
          const label =
            section.type === "hero"
              ? section.headline
              : "heading" in section && section.heading
                ? section.heading
                : section.slot;
          return (
            <li
              key={`${section.type}-${section.slot}-${index}`}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                isHidden ? "border-line/50 bg-line/10 opacity-55" : "border-line bg-paper"
              }`}
            >
              <span className="w-5 shrink-0 font-mono text-[10px] text-ink/40">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{label}</p>
                <p className="truncate font-mono text-[10px] text-ink/40">
                  {section.type} · {getSectionAidaShort(section.type)}
                </p>
              </div>
              <button
                type="button"
                className={btn}
                disabled={index === 0}
                onClick={() => onReorder(index, index - 1)}
                aria-label="위로"
              >
                ↑
              </button>
              <button
                type="button"
                className={btn}
                disabled={index >= sections.length - 1}
                onClick={() => onReorder(index, index + 1)}
                aria-label="아래로"
              >
                ↓
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => onToggleHidden(index)}
              >
                {isHidden ? "표시" : "숨김"}
              </button>
            </li>
          );
        })}
      </ul>

      {!hidePatch && (
        <div className="space-y-2 rounded-xl border border-line bg-line/10 p-3">
          <p className="text-xs font-semibold text-ink">섹션 AI 패치</p>
        <select
          className="h-9 w-full rounded-lg border border-line bg-paper px-2 text-xs"
          value={patchIndex}
          onChange={(e) => onPatchIndexChange(Number(e.target.value))}
        >
          {sections.map((section, index) => (
            <option key={`${section.slot}-${index}`} value={index}>
              {index + 1}. {section.type} / {section.slot}
            </option>
          ))}
        </select>
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
          placeholder='예: "더 고급스럽게", "가운데 카드 강조 문구 짧게", "STEP 제목만 더 짧게"'
          value={patchInstruction}
          onChange={(e) => onPatchInstructionChange(e.target.value)}
        />
        <button
          type="button"
          disabled={patchLoading || !patchInstruction.trim()}
          onClick={onPatchSubmit}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-ink text-sm font-semibold text-paper disabled:opacity-40"
        >
          {patchLoading ? "수정 중..." : "이 섹션만 AI 수정"}
        </button>
      </div>
      )}

      {sections.length > 0 ? (
        <PageStructureChat
          sections={sections}
          hiddenIndexes={hiddenIndexes}
          onReorder={onReorder}
          onToggleHidden={onToggleHidden}
        />
      ) : null}

      {onAddCanvas ? (
        <button
          type="button"
          onClick={onAddCanvas}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-dashed border-line text-xs font-semibold text-ink hover:bg-line/20"
          data-testid="add-canvas-section-mobile"
        >
          자유 캔버스 추가
        </button>
      ) : null}
    </div>
  );
}
