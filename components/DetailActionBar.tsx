"use client";

import SectionPatchChat from "@/components/SectionPatchChat";
import SectionStructureEditor from "@/components/SectionStructureEditor";
import type { PatchChatMessage } from "@/lib/patch-section-suggestions";
import {
  getTemplateSlotCoverage,
  countMissingRequiredSlots,
} from "@/lib/template-slot-coverage";
import { resolveTemplateCategory } from "@/lib/section-templates";
import type { DetailSection } from "@/lib/types/generate";

export type DetailToolTab =
  | "edit"
  | "upload"
  | "ai"
  | "structure"
  | "patch"
  | "instagram"
  | "blog";

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
  patchMessages?: PatchChatMessage[];
  onGifUploadClick?: () => void;
  category?: string;
  feedProductName?: string;
  feedImageUrls?: string[];
  blogProductName?: string;
  blogCategory?: string;
};

const TABS: { id: DetailToolTab; label: string }[] = [
  { id: "edit", label: "직접 편집" },
  { id: "patch", label: "섹션 채팅" },
  { id: "upload", label: "원클릭 업로드" },
  { id: "instagram", label: "인스타 피드" },
  { id: "blog", label: "블로그" },
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
  patchMessages = [],
  onGifUploadClick,
  category,
  feedProductName,
  feedImageUrls,
  blogProductName,
  blogCategory,
}: DetailActionBarProps) {
  const btn =
    "inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-transform transition-colors duration-200 active:scale-[0.98]";

  const templateCat = category ? resolveTemplateCategory(category) : null;
  const slotCoverage =
    category && sections.length > 0 ? getTemplateSlotCoverage(sections, category) : [];
  const missingRequired =
    category && sections.length > 0 ? countMissingRequiredSlots(sections, category) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-ink/15 bg-paper shadow-sm">
      <div
        role="tablist"
        aria-label="상세페이지 수정"
        className="grid grid-cols-4 border-b border-line bg-line/20 sm:grid-cols-7"
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
        <SectionPatchChat
          sections={sections}
          patchIndex={patchIndex}
          onPatchIndexChange={onPatchIndexChange}
          messages={patchMessages}
          instruction={patchInstruction}
          onInstructionChange={onPatchInstructionChange}
          onSubmit={onPatchSubmit}
          loading={patchLoading}
        />
      )}

      {tab === "blog" && blogProductName && blogCategory && (
        <div className="space-y-3 p-4" data-testid="panel-blog">
          <p className="text-xs leading-relaxed text-ink/55">
            상세페이지와 같은 사진·카피로 티스토리/블로그용 글 초안을 만듭니다. 아래{" "}
            <strong>블로그 작업 영역</strong>에서 제목·문단을 고친 뒤 HTML·Markdown으로
            저장하세요.
          </p>
          <ul className="space-y-1 text-[11px] text-ink/50">
            <li>· 제목·요약·태그 수정</li>
            <li>· 문단별 본문·이미지·FAQ 편집</li>
            <li>· 티스토리 HTML / Markdown / TXT 다운로드</li>
          </ul>
        </div>
      )}

      {tab === "instagram" && feedProductName && feedImageUrls && (
        <div className="space-y-3 p-4" data-testid="panel-instagram">
          <p className="text-xs leading-relaxed text-ink/55">
            상세페이지와 같은 사진·카피로 Instagram 1:1 피드 {feedImageUrls.length}장 기준 최대
            7슬라이드를 만듭니다. 아래 <strong>인스타 피드 작업 영역</strong>에서 문구·배경 사진을
            고치고 PNG로 저장하세요. 일상샷(lifestyle-ai)이 있으면 피드에 우선 배치됩니다.
          </p>
          <ul className="space-y-1 text-[11px] text-ink/50">
            <li>· 슬라이드별 제목·보조 문구 수정</li>
            <li>· 상품 사진 번호 선택 또는 슬라이드 전용 업로드</li>
            <li>· 실시간 1080×1080 미리보기 후 PNG 저장</li>
          </ul>
        </div>
      )}

      {tab === "structure" && onReorder && onToggleHidden && (
        <div className="space-y-3 p-4">
          {templateCat && (
            <div className="rounded-lg border border-line bg-line/15 px-3 py-2.5">
              <p className="text-xs font-semibold text-ink">
                템플릿: {templateCat}
                {missingRequired > 0 ? (
                  <span className="ml-2 font-normal text-registration-red">
                    필수 슬롯 {missingRequired}개 누락
                  </span>
                ) : (
                  <span className="ml-2 font-normal text-ink/50">필수 슬롯 충족</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {slotCoverage.map((item) => (
                  <span
                    key={item.slot}
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] ${
                      item.present
                        ? "bg-ink/10 text-ink/70"
                        : item.required
                          ? "bg-registration-red/15 text-registration-red"
                          : "bg-line/40 text-ink/35"
                    }`}
                    title={item.slot}
                  >
                    {item.present ? "✓" : "·"} {item.slot}
                  </span>
                ))}
              </div>
            </div>
          )}
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
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-ink/50">
                동영상처럼 움직이는 사용 장면을 넣으면 체류시간이 올라갑니다. hero 바로 아래에
                삽입됩니다.
              </p>
              <button
                type="button"
                onClick={onGifUploadClick}
                className={`${btn} w-full border border-line text-ink hover:bg-line/30`}
                data-testid="gif-upload"
              >
                GIF 추가 / 교체
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
