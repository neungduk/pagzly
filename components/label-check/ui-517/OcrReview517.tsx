"use client";

import {
  NOTICE_OCR_LOW_CONF_509,
  NOTICE_OCR_LOW_LINES_518,
  NOTICE_OCR_PARTIAL_510,
  NOTICE_OCR_REVIEW_510,
  NOTICE_OCR_REVIEW_USED_510,
  NOTICE_OCR_TRANSFER_508,
  OCR_LOW_CONF_THRESHOLD_509,
  PROGRESS_OCR_REVIEW_508,
} from "@/lib/label-check/ocr/constants";

export type OcrReviewLine517 = { text: string; lowConfidence?: boolean };

export type OcrReview517Props = {
  text: string;
  onChange: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  /** 올린 사진 미리보기(없으면 1열) */
  thumbnailUrl?: string | null;
  /** 줄 단위 신뢰도(518) — 낮은 줄은 노란 배경 + "확인" 표식 */
  lines?: OcrReviewLine517[];
  /** 읽기 품질 안내 문구(518) */
  notices?: string[];
  qualityLabel?: string;
  /** 상세페이지로 보일 때 안내 문구 */
  detailPageHint?: string | null;
  /** '광고 문구만' 모드 제안 버튼(자동 변경하지 않음) */
  onSuggestAdOnly?: () => void;
  /** '광고 문구만'이 이미 골라졌는지(버튼 눌림 표시) */
  adOnlySelected?: boolean;
  /** 외부 OCR 전송 안내(공급자별). 없으면 기본 문구 */
  transferNotice?: string | null;
  busy?: boolean;
  corrections?: string[];
  avgConfidence?: number;
  readStatus?: "ok" | "partial" | "unreadable";
  onFocusPaste?: () => void;
  /** 523 — 토스 등. 미전달 시 웹 기본 제목·설명 */
  title?: string;
  desc?: string;
  /** 523 — 참이면 광고칩에 ✓ 글자 대신 '(선택됨)' */
  useIcons?: boolean;
};

/**
 * 518 — 읽은 글자 확인(517 문법). 무대(왼쪽 큰 패널) 안에 표시한다.
 * 구 OcrReviewCard508 은 그대로 둔다.
 */
export function OcrReview517({
  text,
  onChange,
  onConfirm,
  onCancel,
  thumbnailUrl,
  lines,
  notices,
  qualityLabel,
  detailPageHint,
  onSuggestAdOnly,
  adOnlySelected = false,
  transferNotice,
  busy = false,
  corrections,
  avgConfidence,
  readStatus,
  onFocusPaste,
  title,
  desc,
  useIcons = false,
}: OcrReview517Props) {
  const lowLines = (lines || []).filter((l) => l.lowConfidence && l.text.trim());
  const hasLow = lowLines.length > 0;
  const lowAvg =
    typeof avgConfidence === "number" && avgConfidence > 0 && avgConfidence < OCR_LOW_CONF_THRESHOLD_509;
  const partial = readStatus === "partial";
  const extraNotices = (notices || []).filter(
    (n) => n && n !== NOTICE_OCR_LOW_LINES_518 && n !== detailPageHint,
  );

  return (
    <div className="lc517-ocr" data-testid="lc517-ocr-review">
      <header className="lc517-ocr-head">
        <h2 className="lc517-ocr-title">{title ?? "읽은 글자를 확인해 주세요"}</h2>
        <p className="lc517-ocr-desc">
          {desc ?? `${NOTICE_OCR_REVIEW_510} ${NOTICE_OCR_REVIEW_USED_510}`}
        </p>
        <p className="lc517-ocr-fine" role="note">
          {transferNotice || NOTICE_OCR_TRANSFER_508}
        </p>
        <span className="sr-only">{PROGRESS_OCR_REVIEW_508}</span>
      </header>

      {detailPageHint ? (
        <div className="lc517-ocr-note" role="status">
          <p style={{ margin: 0 }}>{detailPageHint}</p>
          {onSuggestAdOnly ? (
            <button
              type="button"
              className="lc517-ocr-chip"
              aria-pressed={adOnlySelected}
              onClick={onSuggestAdOnly}
            >
              {adOnlySelected
                ? useIcons
                  ? "광고 문구만 점검 (선택됨)"
                  : "광고 문구만 점검 ✓"
                : "광고 문구만 점검"}
            </button>
          ) : null}
        </div>
      ) : null}

      {partial ? (
        <div className="lc517-ocr-note" role="status">
          <p style={{ margin: 0 }}>{NOTICE_OCR_PARTIAL_510}</p>
          {onFocusPaste ? (
            <button type="button" className="lc517-ocr-chip" onClick={onFocusPaste}>
              문구 붙여넣기로 점검
            </button>
          ) : null}
        </div>
      ) : null}

      {lowAvg ? (
        <p className="lc517-ocr-note" role="status" style={{ margin: 0 }}>
          {NOTICE_OCR_LOW_CONF_509}
        </p>
      ) : null}

      {extraNotices.map((n) => (
        <p key={n} className="lc517-ocr-note" role="status" style={{ margin: 0 }}>
          {n}
        </p>
      ))}

      {corrections && corrections.length ? (
        <ul className="lc517-ocr-fine" style={{ margin: 0, paddingLeft: 18 }}>
          {corrections.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}

      <div className={`lc517-ocr-cols${thumbnailUrl ? " has-thumb" : ""}`}>
        {thumbnailUrl ? (
          <div className="lc517-ocr-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt="올린 사진" />
          </div>
        ) : null}

        <div className="lc517-ocr-main">
          {hasLow ? (
            <section className="lc517-ocr-lines" aria-label="확인이 필요한 줄">
              <p className="lc517-ocr-lines-note">{NOTICE_OCR_LOW_LINES_518}</p>
              <ul className="lc517-ocr-lines-list">
                {(lines || [])
                  .filter((l) => l.text.trim())
                  .map((l, i) => (
                    <li key={i} className={l.lowConfidence ? "low" : undefined}>
                      {l.lowConfidence ? <b className="lc517-ocr-tag">확인</b> : null}
                      <span>{l.text}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          <label className="lc517-ocr-field">
            <span className="lc517-ocr-label">읽은 글자</span>
            <textarea
              className="lc517-ocr-textarea"
              aria-label="읽은 글자 확인·수정"
              value={text}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
            />
          </label>

          <div className="lc517-ocr-foot">
            <span className="lc517-mono lc517-ocr-count">
              {text.length}자
              {qualityLabel ? ` · ${qualityLabel}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="lc517-ocr-actions">
        <button
          type="button"
          className="lc517-ocr-primary"
          disabled={busy || !text.trim()}
          onClick={onConfirm}
        >
          {busy ? "규칙과 비교하는 중…" : "이 글자로 점검"}
        </button>
        <button type="button" className="lc517-ocr-secondary" disabled={busy} onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}
