"use client";

type DetailActionBarProps = {
  editMode: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onUploadClick: () => void;
  onAiClick: () => void;
  saving?: boolean;
};

export default function DetailActionBar({
  editMode,
  onToggleEdit,
  onSave,
  onUploadClick,
  onAiClick,
  saving,
}: DetailActionBarProps) {
  const btn =
    "inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onToggleEdit}
        className={`${btn} ${
          editMode ? "bg-ink text-paper" : "border border-line text-ink hover:bg-line/30"
        }`}
      >
        직접 편집
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!editMode || saving}
        className={`${btn} border border-line text-ink hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {saving ? "저장 중..." : "저장"}
      </button>
      <button
        type="button"
        onClick={onUploadClick}
        className={`${btn} border border-line text-ink hover:bg-line/30`}
      >
        원클릭 업로드
      </button>
      <button
        type="button"
        onClick={onAiClick}
        className={`${btn} bg-registration-red text-paper hover:bg-registration-red/85`}
      >
        AI 자동 생성
      </button>
    </div>
  );
}
