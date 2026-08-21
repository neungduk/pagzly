"use client";

import { useState } from "react";

type BackdropCandidatePickerProps = {
  urls: string[];
  onConfirm: (url: string) => void;
};

export default function BackdropCandidatePicker({
  urls,
  onConfirm,
}: BackdropCandidatePickerProps) {
  const [selected, setSelected] = useState(0);
  const preview = urls[selected] ?? urls[0];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-paper"
      data-testid="backdrop-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backdrop-picker-title"
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h2 id="backdrop-picker-title" className="font-heading text-2xl font-bold text-ink">
          배경을 골라 주세요
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          후보를 클릭해 크게 본 뒤, 이걸로 확정하면 상품 사진에 합성합니다.
        </p>

        {preview ? (
          <button
            type="button"
            className="mt-6 w-full overflow-hidden rounded-2xl border border-line bg-white"
            onClick={() => undefined}
            aria-label="선택한 배경 미리보기"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`배경 후보 ${selected + 1} 미리보기`}
              className="mx-auto max-h-[52vh] w-full object-contain"
              data-testid="backdrop-preview"
            />
          </button>
        ) : null}

        <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {urls.map((url, index) => {
            const isSelected = index === selected;
            return (
              <li key={url}>
                <button
                  type="button"
                  data-testid={`backdrop-candidate-${index}`}
                  onClick={() => setSelected(index)}
                  className={`overflow-hidden rounded-xl border-2 ${
                    isSelected
                      ? "border-registration-red"
                      : "border-line hover:border-ink/30"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`배경 후보 ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          data-testid="backdrop-confirm"
          disabled={!preview}
          onClick={() => {
            if (preview) onConfirm(preview);
          }}
          className="mt-8 flex h-14 w-full items-center justify-center rounded-xl bg-registration-red text-base font-semibold text-paper transition-colors hover:bg-registration-red/85 disabled:cursor-not-allowed disabled:opacity-60"
        >
          이걸로 확정
        </button>
      </div>
    </div>
  );
}
