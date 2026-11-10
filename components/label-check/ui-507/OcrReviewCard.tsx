"use client";

import {
  NOTICE_OCR_LOW_CONF_509,
  NOTICE_OCR_REVIEW_508,
  OCR_LOW_CONF_THRESHOLD_509,
  PROGRESS_OCR_REVIEW_508,
} from "@/lib/label-check/ocr/constants";

/**
 * 509 — 게스트·회원 공용 OCR 확인 화면
 * (읽은 글자 편집 · 보정 · 외부 전송 안내 · 신뢰도 낮음 경고)
 */
export type OcrReviewCard508Props = {
  text: string;
  onText: (t: string) => void;
  corrections: string[];
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** 외부 OCR 전송 안내(공급자별) */
  transferNotice?: string | null;
  avgConfidence?: number;
};

export function OcrReviewCard508({
  text,
  onText,
  corrections,
  busy,
  onConfirm,
  onCancel,
  transferNotice,
  avgConfidence,
}: OcrReviewCard508Props) {
  const lowConf =
    typeof avgConfidence === "number" && avgConfidence > 0 && avgConfidence < OCR_LOW_CONF_THRESHOLD_509;

  return (
    <section className="lc507-card lc507-ocr-review">
      <h2 className="lc507-title" style={{ fontSize: 18 }}>
        {PROGRESS_OCR_REVIEW_508}
      </h2>
      <p className="lc507-fine">{NOTICE_OCR_REVIEW_508}</p>
      {transferNotice ? <p className="lc507-fine">{transferNotice}</p> : null}
      {lowConf ? (
        <p className="lc507-fine" role="status" style={{ color: "var(--lc507-warn)" }}>
          {NOTICE_OCR_LOW_CONF_509}
        </p>
      ) : null}
      {corrections.length ? (
        <ul className="lc507-fine list-disc space-y-1 pl-5">
          {corrections.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}
      <label className="lc507-fine lc507-ocr-review-label">
        읽은 글자
        <textarea
          className="lc507-textarea lc507-ocr-review-textarea"
          style={{ minHeight: 180 }}
          aria-label="읽은 글자 확인·수정"
          value={text}
          onChange={(e) => onText(e.target.value)}
        />
      </label>
      <button type="button" className="lc507-cta" disabled={busy || !text.trim()} onClick={onConfirm}>
        {busy ? "규칙과 비교하는 중…" : "이 글자로 점검"}
      </button>
      <button type="button" className="lc507-copy" disabled={busy} onClick={onCancel}>
        취소
      </button>
    </section>
  );
}
