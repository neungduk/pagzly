"use client";

import { useCallback, useRef, type DragEvent, type KeyboardEvent, type RefObject } from "react";
import type { LabelCheckInput, LabelMarket } from "@/lib/label-check/types";
import { DISCLAIMER_PRINT_485 } from "@/lib/label-check/types";
import { PRODUCT_TYPE_OPTIONS_504 } from "@/lib/label-check/product-type-options-504";
import {
  CTA_LABEL_507,
  PROGRESS_READ_507,
  PROGRESS_RULES_507,
  UPLOAD_TITLE_507,
} from "@/lib/label-check/ui-status-507";
import { CTA_OCR_508 } from "@/lib/label-check/ocr/constants";

export type UploadCard507Props = {
  market: LabelMarket;
  onMarket: (m: LabelMarket) => void;
  file: File | null;
  onFile: (f: File | null) => void;
  pasteText: string;
  onPasteText: (t: string) => void;
  textScope: "ad_only" | "full";
  onTextScope: (s: "ad_only" | "full") => void;
  input: LabelCheckInput;
  onInputPatch: (p: Partial<LabelCheckInput>) => void;
  productName?: string;
  onProductName?: (v: string) => void;
  showProductName?: boolean;
  busy: boolean;
  progress: string | null;
  onSubmit: () => void;
  bothInputsHint?: boolean;
  /** 508 — 붙여넣기 포커스용 */
  pasteTextareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** 508 — PDF+이미지 */
  acceptImages?: boolean;
  ocrHint?: string | null;
  onStartOcr?: () => void;
  ocrAvailable?: boolean;
  ocrTransferNotice?: string | null;
};

export function UploadCard507(props: UploadCard507Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    market,
    onMarket,
    file,
    onFile,
    pasteText,
    onPasteText,
    textScope,
    onTextScope,
    input,
    onInputPatch,
    busy,
    progress,
    onSubmit,
  } = props;

  const pick = useCallback(() => inputRef.current?.click(), []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0] ?? null;
      if (f) onFile(f);
    },
    [onFile],
  );

  const onKeyDrop = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    },
    [pick],
  );

  const ctaLabel = busy
    ? progress?.includes("글자") || progress?.includes("읽는")
      ? PROGRESS_READ_507
      : PROGRESS_RULES_507
    : CTA_LABEL_507;

  const canSubmit = Boolean(file) || Boolean(pasteText.trim());

  return (
    <section className="lc507-card">
      <h1 className="lc507-title">{UPLOAD_TITLE_507}</h1>
      <div className="lc507-steps" aria-label="진행 단계">
        <b>1 올리기</b>
        <span>2 결과 보기</span>
        <span>3 고쳐서 다시 점검</span>
      </div>

      <div className="lc507-seg" role="radiogroup" aria-label="판매 국가">
        <button
          type="button"
          role="radio"
          aria-checked={market === "KR"}
          className={market === "KR" ? "on" : undefined}
          onClick={() => onMarket("KR")}
        >
          한국에서 판매
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={market === "US"}
          className={market === "US" ? "on" : undefined}
          onClick={() => onMarket("US")}
        >
          미국에서 판매
        </button>
      </div>

      <div
        className="lc507-drop"
        role="button"
        tabIndex={0}
        aria-label="PDF를 여기에 놓거나 눌러서 선택"
        onClick={pick}
        onKeyDown={onKeyDrop}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <b>
          {props.acceptImages
            ? "PDF·사진(JPG/PNG/WEBP)을 놓거나 눌러서 선택"
            : "PDF를 여기에 놓거나 눌러서 선택"}
        </b>
        <small>파일은 내 컴퓨터에서 글자만 읽습니다 · PDF 최대 100MB · 사진 장당 10MB</small>
        {file ? (
          <p className="lc507-fine" style={{ marginTop: 8 }}>
            {file.name} · {(file.size / 1024).toFixed(1)} KB{" "}
            <button
              type="button"
              className="lc507-copy"
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
            >
              다른 파일
            </button>
          </p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={
          props.acceptImages
            ? "application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            : "application/pdf,.pdf"
        }
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      <div className="lc507-or">또는 문구만 붙여넣기</div>
      {props.bothInputsHint ? (
        <p className="lc507-fine">PDF와 문구가 모두 있으면 PDF를 먼저 점검합니다.</p>
      ) : null}
      <label className="lc507-fine">
        문구 붙여넣기
        <textarea
          ref={props.pasteTextareaRef}
          className="lc507-textarea"
          aria-label="문구 붙여넣기"
          placeholder="상세페이지·라벨 문구를 붙여넣으세요"
          value={pasteText}
          onChange={(e) => onPasteText(e.target.value)}
          disabled={Boolean(file)}
        />
      </label>
      {props.ocrHint ? <p className="lc507-fine">{props.ocrHint}</p> : null}
      {props.ocrAvailable && props.onStartOcr && file ? (
        <div className="flex flex-col gap-1">
          {props.ocrTransferNotice ? <p className="lc507-fine">{props.ocrTransferNotice}</p> : null}
          <button type="button" className="lc507-cta" style={{ fontSize: 14 }} disabled={busy} onClick={props.onStartOcr}>
            {CTA_OCR_508}
          </button>
        </div>
      ) : null}
      {!file ? (
        <fieldset className="flex flex-wrap gap-3 text-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">문구 점검 범위</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="lc507-scope"
              checked={textScope === "ad_only"}
              onChange={() => onTextScope("ad_only")}
            />
            광고 문구만
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="lc507-scope"
              checked={textScope === "full"}
              onChange={() => onTextScope("full")}
            />
            라벨 전체 문구
          </label>
        </fieldset>
      ) : null}

      {props.showProductName ? (
        <label className="lc507-fine">
          제품명(선택)
          <input
            className="lc507-textarea"
            style={{ minHeight: 40 }}
            value={props.productName || ""}
            onChange={(e) => props.onProductName?.(e.target.value)}
            maxLength={80}
          />
        </label>
      ) : null}

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-[var(--lc507-sub)]">
          제품 정보 선택 (더 정확해져요)
        </summary>
        <div className="mt-2 space-y-2 text-sm">
          {market === "KR" ? (
            <>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="lc507-rinse"
                  checked={!input.rinseOff}
                  onChange={() => onInputPatch({ rinseOff: false })}
                />
                안 씻어내는 제품
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="lc507-rinse"
                  checked={input.rinseOff}
                  onChange={() => onInputPatch({ rinseOff: true })}
                />
                씻어내는 제품
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={input.functional}
                  onChange={(e) => onInputPatch({ functional: e.target.checked })}
                />
                기능성화장품
              </label>
              <div className="grid gap-1.5 pt-1">
                {PRODUCT_TYPE_OPTIONS_504.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 font-normal">
                    <input
                      type="checkbox"
                      checked={(input.productTypes || []).includes(o.id)}
                      onChange={(e) => {
                        const prev = input.productTypes || [];
                        onInputPatch({
                          productTypes: e.target.checked
                            ? [...prev, o.id]
                            : prev.filter((x) => x !== o.id),
                        });
                      }}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(input.imported)}
                  onChange={(e) => onInputPatch({ imported: e.target.checked })}
                />
                수입품
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(input.professionalUse)}
                  onChange={(e) => onInputPatch({ professionalUse: e.target.checked })}
                />
                전문가용
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(input.hazardous)}
                  onChange={(e) => onInputPatch({ hazardous: e.target.checked })}
                />
                에어로졸/아동용 등 위험 제품
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(input.otcDrugLike)}
                  onChange={(e) => onInputPatch({ otcDrugLike: e.target.checked })}
                />
                자외선차단·여드름 등 OTC 의약품 성격
              </label>
            </>
          )}
        </div>
      </details>

      <button
        type="button"
        className="lc507-cta"
        disabled={busy || !canSubmit}
        onClick={onSubmit}
      >
        {ctaLabel}
      </button>
      <p className="lc507-fine">{DISCLAIMER_PRINT_485}</p>
    </section>
  );
}
