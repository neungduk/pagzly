"use client";

import { CTA_OCR_PASTE_509 } from "@/lib/label-check/ocr/constants";

/** 509 — OCR_LIMIT(월/일) 안내 + 붙여넣기 이동 CTA. (판정 점수·빈결과 문구는 넣지 않음) */
export type OcrLimitBanner509Props = {
  message: string;
  onFocusPaste: () => void;
};

export function OcrLimitBanner509({ message, onFocusPaste }: OcrLimitBanner509Props) {
  return (
    <div className="lc507-card lc507-ocr-limit" role="alert" style={{ borderColor: "var(--lc507-bad)" }}>
      <p className="lc507-fine" style={{ margin: 0 }}>
        {message}
      </p>
      <button type="button" className="lc507-cta" onClick={onFocusPaste}>
        {CTA_OCR_PASTE_509}
      </button>
    </div>
  );
}
