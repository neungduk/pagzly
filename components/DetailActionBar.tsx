"use client";

import SectionStructureEditor from "@/components/SectionStructureEditor";
import type { DetailSection } from "@/lib/types/generate";

export type DetailToolTab = "edit" | "upload" | "ai" | "structure" | "patch";

type DetailActionBarProps = {
  tab: DetailToolTab;
  onTabChange: (tab: DetailToolTab) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  saving?: boolean;
  onUploadClick: () => void;
  replaceImageIndex: number;
  imageCount: number;
  onReplaceIndexChange: (index: number) => void;
  aiText: string;
  onAiTextChange: (value: string) => void;
  onAiSubmit: () => void;
  aiLoading?: boolean;
  sections?: DetailSection[];
  hiddenIndexes?: number[];
  onReorder?: (from: number, to: number) => void;
  onToggleHidden?: (index: number) => void;
  patchIndex?: number;
  onPatchIndexChange?: (index: number) => void;
  patchInstruction?: string;
  onPatchInstructionChange?: (value: string) => void;
  onPatchSubmit?: () => void;
  patchLoading?: boolean;
  onGifUploadClick?: () => void;
};

const TABS: { id: DetailToolTab; label: string }[] = [
  { id: "edit", label: "직접 편집" },
  { id: "patch", label: "섹션 AI" },
  { id: "upload", label: "원클릭 업로드" },
  { id: "ai", label: "AI 자동 생성" },
  { id: "structure", label: "구성" },
];

export default function DetailActionBar({
  tab,
  onTabChange,
  editMode,
  onToggleEdit,
  onSave,
  saving,
  onUploadClick,
  replaceImageIndex,
  imageCount,
  onReplaceIndexChange,
  aiText,
  onAiTextChange,
  onAiSubmit,
  aiLoading,
  sections = [],
  hiddenIndexes = [],
  onReorder,
  onToggleHidden,
  patchIndex = 0,
  onPatchIndexChange,
  patchInstruction = "",
  onPatchInstructionChange,
  onPatchSubmit,
  patchLoading,
  onGifUploadClick,
}: DetailActionBarProps) {
  const btn =
    "inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-transform transition-colors duration-200 active:scale-[0.98]";

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-ink/15 bg-paper shadow-sm">
      <div
        role="tablist"
        aria-label="상세페이지 수정"
        className="grid grid-cols-3 border-b border-line bg-line/20 sm:grid-cols-5"
      >
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`h-12 px-2 text-xs font-semibold transition-colors sm:text-sm ${
                active
                  ? "bg-ink text-paper"
                  : "text-ink/60 hover:bg-line/40 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "edit" && (
        <div className="space-y-3 p-4" data-testid="panel-edit">
          <p className="text-xs leading-relaxed text-ink/55">
            섹션 제목·본문을 그 자리에서 고치고, 사진을 눌러 교체할 수 있습니다.
            저장을 눌러야 세션에 남습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleEdit}
              className={`${btn} ${
                editMode ? "bg-ink text-paper" : "border border-line text-ink hover:bg-line/30"
              }`}
            >
              {editMode ? "편집 중" : "편집 시작"}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!editMode || saving}
              className={`${btn} border border-line text-ink hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {tab === "upload" && (
        <div className="space-y-3 p-4" data-testid="panel-upload">
          <p className="text-xs leading-relaxed text-ink/55">
            JPG·PNG, 8MB 이하만 가능합니다. 미리보기는 즉시 바뀌고, 로그인되어
            있으면 저장소에도 올립니다.
          </p>
          {imageCount > 0 && (
            <label className="block text-xs font-medium text-ink/70">
              교체할 사진
              <select
                data-testid="replace-image-index"
                value={Math.min(replaceImageIndex, Math.max(0, imageCount - 1))}
                onChange={(e) => onReplaceIndexChange(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm"
              >
                {Array.from({ length: imageCount }, (_, i) => (
                  <option key={i} value={i}>
                    사진 {i + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={onUploadClick}
            className={`${btn} bg-ink text-paper hover:bg-ink/85`}
          >
            원클릭 업로드
          </button>
        </div>
      )}

      {tab === "ai" && (
        <div className="space-y-3 p-4" data-testid="panel-ai">
          <p className="text-xs leading-relaxed text-ink/55">
            1688/도매꾹 원본 상품명·스펙·설명을 붙여넣으면 카피를 다시 만듭니다.
            비어 있으면 AI를 호출하지 않습니다.
          </p>
          <textarea
            data-testid="ai-wholesale"
            value={aiText}
            onChange={(e) => onAiTextChange(e.target.value)}
            rows={5}
            placeholder="원본 판매 페이지의 상품명, 스펙, 상세 설명을 붙여넣어 주세요."
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
          <button
            type="button"
            data-testid="ai-submit"
            onClick={onAiSubmit}
            disabled={aiLoading}
            className={`${btn} bg-registration-red text-paper hover:bg-registration-red/85 disabled:opacity-50`}
          >
            {aiLoading ? "생성 중..." : "생성 요청"}
          </button>
        </div>
      )}

      {tab === "patch" && onPatchIndexChange && onPatchInstructionChange && onPatchSubmit && (
        <div className="space-y-3 p-4" data-testid="panel-patch">
          <p className="text-xs leading-relaxed text-ink/55">
            한 섹션만 골라 지시하면 카피·문구를 AI가 같은 구조로 수정합니다. 저장을 눌러 유지하세요.
          </p>
          <label className="block text-xs font-medium text-ink/70">
            수정할 섹션
            <select
              data-testid="patch-section-index"
              className="mt-1 h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm"
              value={patchIndex}
              onChange={(e) => onPatchIndexChange(Number(e.target.value))}
            >
              {sections.map((section, index) => {
                const label =
                  section.type === "hero"
                    ? section.headline
                    : "heading" in section && section.heading
                      ? section.heading
                      : section.slot;
                return (
                  <option key={`${section.slot}-${index}`} value={index}>
                    {index + 1}. {label}
                  </option>
                );
              })}
            </select>
          </label>
          <textarea
            data-testid="patch-instruction"
            className="min-h-[88px] w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            placeholder='예: "더 짧게", "혜택 강조", "톤을 캐주얼하게"'
            value={patchInstruction}
            onChange={(e) => onPatchInstructionChange(e.target.value)}
          />
          <button
            type="button"
            data-testid="patch-submit"
            disabled={patchLoading || !patchInstruction.trim()}
            onClick={onPatchSubmit}
            className={`${btn} w-full bg-registration-red text-paper hover:bg-registration-red/85 disabled:opacity-40`}
          >
            {patchLoading ? "수정 중..." : "이 섹션만 AI 수정"}
          </button>
        </div>
      )}

      {tab === "structure" && onReorder && onToggleHidden && (
        <div className="space-y-3 p-4">
          <SectionStructureEditor
            sections={sections}
            hiddenIndexes={hiddenIndexes}
            onReorder={onReorder}
            onToggleHidden={onToggleHidden}
            patchIndex={patchIndex}
            onPatchIndexChange={onPatchIndexChange ?? (() => {})}
            patchInstruction={patchInstruction}
            onPatchInstructionChange={onPatchInstructionChange ?? (() => {})}
            onPatchSubmit={onPatchSubmit ?? (() => {})}
            patchLoading={patchLoading}
            hidePatch
          />
          {onGifUploadClick && (
            <button
              type="button"
              onClick={onGifUploadClick}
              className={`${btn} w-full border border-line text-ink hover:bg-line/30`}
              data-testid="gif-upload"
            >
              GIF 추가 / 교체
            </button>
          )}
        </div>
      )}
    </div>
  );
}
