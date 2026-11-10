"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "@/components/label-check/ui-507/label-check-507.css";
import { UploadCard507, ResultView507, OcrReviewCard508 } from "@/components/label-check/ui-507";
import type { LabelCheckInput, LabelCheckResult, LabelMarket } from "@/lib/label-check/types";
import { SAMPLE_BANNER_486 } from "@/lib/label-check/types";
import {
  assertClientPdfSize,
  submitLabelCheckClient,
  submitLabelCheckTextClient,
} from "@/lib/label-check/client-submit";
import sampleResultA from "@/lib/label-check/sample-result-a.json";
import { labelContactEmail } from "@/lib/label-check/contact";
import { issueKeysFromFindings506 } from "@/lib/label-check/compare-506";
import { PROGRESS_READ_507, PROGRESS_RULES_507 } from "@/lib/label-check/ui-status-507";
import {
  fetchOcrAvailable508,
  runOcrFromFile508,
  submitOcrReviewedText508,
} from "@/lib/label-check/client-ocr-submit";
import { isOcrImageFile508, isHeicFile508 } from "@/lib/label-check/client-ocr-prepare";
import { ERR_OCR_HEIC_508 } from "@/lib/label-check/ocr/constants";

function todayKo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LabelCheckPage() {
  const [market, setMarket] = useState<LabelMarket>("KR");
  const [input, setInput] = useState<LabelCheckInput>({
    rinseOff: false,
    functional: false,
    market: "KR",
    productTypes: [],
  });
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [textScope, setTextScope] = useState<"ad_only" | "full">("ad_only");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabelCheckResult | null>(null);
  const [checkedOn, setCheckedOn] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [recheckText, setRecheckText] = useState("");
  const [copied, setCopied] = useState(false);
  const [ocrAvailable, setOcrAvailable] = useState(false);
  const [ocrReview, setOcrReview] = useState<{
    text: string;
    corrections: string[];
    avgConfidence: number;
  } | null>(null);
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);
  const contactEmail = labelContactEmail();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("market");
    if (q && q.toUpperCase() === "US") {
      setMarket("US");
      setInput((p) => ({ ...p, market: "US" }));
    }
    void fetchOcrAvailable508().then(setOcrAvailable);
  }, []);

  const onFile = useCallback((f: File | null) => {
    setResult(null);
    setIsSample(false);
    setError(null);
    setOcrReview(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (isHeicFile508(f)) {
      setError(ERR_OCR_HEIC_508);
      setFile(null);
      return;
    }
    const sizeErr = assertClientPdfSize(f);
    if (sizeErr) {
      setError(sizeErr);
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const showSample = useCallback(() => {
    setError(null);
    setFile(null);
    setIsSample(true);
    setOcrReview(null);
    setMarket("KR");
    setResult(sampleResultA.result as LabelCheckResult);
    setCheckedOn(todayKo());
  }, []);

  const focusPaste = useCallback(() => {
    setFile(null);
    setResult(null);
    setOcrReview(null);
    window.setTimeout(() => pasteRef.current?.focus(), 50);
  }, []);

  const runOcrCore = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    const out = await runOcrFromFile508(file, (msg) => setProgress(msg));
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setOcrReview({
      text: out.review.text,
      corrections: out.review.corrections,
      avgConfidence: out.review.avgConfidence,
    });
  };

  const startOcr = async () => {
    setBusy(true);
    try {
      await runOcrCore();
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const confirmOcr = async () => {
    if (!ocrReview?.text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setProgress(PROGRESS_RULES_507);
      const out = await submitOcrReviewedText508(ocrReview.text, {
        ...input,
        market,
        avgOcrConfidence: ocrReview.avgConfidence,
      });
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setResult(out.result);
      setCheckedOn(todayKo());
      setOcrReview(null);
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const runCheck = async () => {
    setBusy(true);
    setError(null);
    setIsSample(false);
    try {
      if (file && isOcrImageFile508(file)) {
        if (!ocrAvailable) {
          setError("사진은 글자 읽기(OCR)가 켜져 있을 때만 점검할 수 있어요. 문구를 붙여넣어 주세요.");
          return;
        }
        await runOcrCore();
        return;
      }
      if (file) {
        setProgress(PROGRESS_READ_507);
        const out = await submitLabelCheckClient(
          file,
          { ...input, market },
          (msg) => setProgress(msg || PROGRESS_RULES_507),
        );
        if (!out.ok) {
          setError(out.error);
          return;
        }
        setResult(out.result);
        setCheckedOn(todayKo());
      } else if (pasteText.trim()) {
        setProgress(PROGRESS_RULES_507);
        const out = await submitLabelCheckTextClient(pasteText, {
          ...input,
          market,
          scope: textScope,
        });
        if (!out.ok) {
          setError(out.error);
          return;
        }
        setResult(out.result);
        setCheckedOn(todayKo());
      } else {
        setError("PDF·사진을 선택하거나 문구를 붙여넣으세요.");
      }
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const recheck = async () => {
    if (!recheckText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const priorKeys = result ? issueKeysFromFindings506(result.findings) : undefined;
      const out = await submitLabelCheckTextClient(recheckText, {
        ...input,
        market,
        scope: textScope,
        priorKeys,
      });
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setResult(out.result);
      setCheckedOn(todayKo());
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="lc507 min-h-screen">
      <div className="lc507-wrap">
        <header className="lc507-print-hide flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold tracking-wide text-[var(--lc507-brand)]">Pagzly · 표시사항 사전 점검</p>
          <nav className="flex flex-wrap gap-3 text-sm" aria-label="계정">
            <Link href="/login?next=%2Flabel-check%2Fnew" className="underline-offset-2 hover:underline">
              로그인
            </Link>
            <Link href="/label-check/history" className="underline-offset-2 hover:underline">
              내 결과
            </Link>
            <Link href="/label-check/new" className="underline-offset-2 hover:underline">
              회원 점검
            </Link>
          </nav>
        </header>

        {!ocrReview ? (
          <UploadCard507
            market={market}
            onMarket={(m) => {
              setMarket(m);
              setInput((p) => ({ ...p, market: m }));
            }}
            file={file}
            onFile={onFile}
            pasteText={pasteText}
            onPasteText={setPasteText}
            textScope={textScope}
            onTextScope={setTextScope}
            input={{ ...input, market }}
            onInputPatch={(p) => setInput((prev) => ({ ...prev, ...p }))}
            busy={busy}
            progress={progress}
            onSubmit={() => void runCheck()}
            bothInputsHint={Boolean(file && pasteText.trim())}
            pasteTextareaRef={pasteRef}
            acceptImages
            ocrAvailable={ocrAvailable}
            onStartOcr={() => void startOcr()}
          />
        ) : (
          <OcrReviewCard508
            text={ocrReview.text}
            onText={(t) => setOcrReview((p) => (p ? { ...p, text: t } : p))}
            corrections={ocrReview.corrections}
            busy={busy}
            onConfirm={() => void confirmOcr()}
            onCancel={() => setOcrReview(null)}
          />
        )}

        <p className="lc507-fine lc507-print-hide">
          <button type="button" className="underline-offset-2 hover:underline" onClick={showSample}>
            샘플 결과 보기
          </button>
        </p>

        {error ? (
          <p className="lc507-card" role="alert" style={{ borderColor: "var(--lc507-bad)" }}>
            {error}
          </p>
        ) : null}

        {isSample ? <p className="lc507-fine">{SAMPLE_BANNER_486}</p> : null}

        {result ? (
          <ResultView507
            result={result}
            productName={isSample ? sampleResultA.meta.product : null}
            checkedOn={checkedOn ?? undefined}
            isMember={false}
            recheckText={recheckText}
            onRecheckText={setRecheckText}
            onRecheck={() => void recheck()}
            recheckBusy={busy}
            ocrAvailable={ocrAvailable}
            onStartOcr={() => void startOcr()}
            onFocusPaste={focusPaste}
          />
        ) : null}

        {contactEmail ? (
          <p className="lc507-fine lc507-print-hide">
            문의{" "}
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => {
                void navigator.clipboard.writeText(contactEmail).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? "복사됨" : contactEmail}
            </button>
          </p>
        ) : null}

        <nav className="lc507-fine flex flex-wrap gap-3 lc507-print-hide" aria-label="약관">
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">
            이용약관
          </Link>
        </nav>
      </div>
    </main>
  );
}
