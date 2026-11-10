"use client";

import {
  NOTICE_OCR_REVIEW_508,
  PROGRESS_OCR_REVIEW_508,
} from "@/lib/label-check/ocr/constants";

export type OcrReviewCard508Props = {
  text: string;
  onText: (t: string) => void;
  corrections: string[];
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function OcrReviewCard508({
  text,
  onText,
  corrections,
  busy,
  onConfirm,
  onCancel,
}: OcrReviewCard508Props) {
  return (
    <section className="lc507-card">
      <h2 className="lc507-title" style={{ fontSize: 18 }}>
        {PROGRESS_OCR_REVIEW_508}
      </h2>
      <p className="lc507-fine">{NOTICE_OCR_REVIEW_508}</p>
      {corrections.length ? (
        <ul className="lc507-fine list-disc space-y-1 pl-5">
          {corrections.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}
      <label className="lc507-fine">
        읽은 글자
        <textarea
          className="lc507-textarea"
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
