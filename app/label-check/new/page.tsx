"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "@/components/label-check/ui-507/label-check-507.css";
import {
  UploadCard507,
  ResultView507,
  OcrReviewCard508,
  OcrLimitBanner509,
} from "@/components/label-check/ui-507";
import {
  LabelSiteShell511,
  LabelHeader511,
  LabelFooter511,
  CheckBusyOverlay511,
} from "@/components/label-check/ui-511";
import LogoutButton from "@/components/LogoutButton";
import type { LabelCheckInput, LabelCheckResult, LabelMarket } from "@/lib/label-check/types";
import {
  assertClientPdfSize,
  submitLabelCheckClient,
  submitLabelCheckTextClient,
} from "@/lib/label-check/client-submit";
import { ERR_LOGIN_EXPIRED_495 } from "@/lib/label-check/member-constants";
import { issueKeysFromFindings506 } from "@/lib/label-check/compare-506";
import { PROGRESS_READ_507, PROGRESS_RULES_507 } from "@/lib/label-check/ui-status-507";
import {
  fetchOcrAvailable508,
  runOcrFromFile508,
  submitOcrReviewedText508,
} from "@/lib/label-check/client-ocr-submit";
import { isOcrImageFile508, isHeicFile508 } from "@/lib/label-check/client-ocr-prepare";
import { ERR_OCR_HEIC_508 } from "@/lib/label-check/ocr/constants";
import type { OcrProviderId508 } from "@/lib/label-check/ocr/provider";

function todayKo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LabelCheckNewPage() {
  const [market, setMarket] = useState<LabelMarket>("KR");
  const [input, setInput] = useState<LabelCheckInput>({
    rinseOff: false,
    functional: false,
    market: "KR",
    productTypes: [],
  });
  const [productName, setProductName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [textScope, setTextScope] = useState<"ad_only" | "full">("ad_only");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabelCheckResult | null>(null);
  const [checkedOn, setCheckedOn] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [recheckText, setRecheckText] = useState("");
  const [ocrAvailable, setOcrAvailable] = useState(false);
  const [ocrTileH, setOcrTileH] = useState(2400);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [ocrProvider, setOcrProvider] = useState<OcrProviderId508 | null>(null);
  const [ocrLimitMsg, setOcrLimitMsg] = useState<string | null>(null);
  const [ocrReview, setOcrReview] = useState<{
    text: string;
    corrections: string[];
    avgConfidence: number;
    readStatus?: "ok" | "partial" | "unreadable";
  } | null>(null);
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void fetchOcrAvailable508(market).then((r) => {
      setOcrAvailable(r.available);
      setOcrTileH(r.tileHeightPx);
      setOcrNotice(r.notice || null);
      setOcrProvider(r.provider);
    });
  }, [market]);

  const onFile = useCallback((f: File | null) => {
    setError(null);
    setOcrLimitMsg(null);
    setResult(null);
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

  const focusPaste = useCallback(() => {
    setFile(null);
    setResult(null);
    setSavedId(null);
    setOcrReview(null);
    setOcrLimitMsg(null);
    setError(null);
    window.setTimeout(() => pasteRef.current?.focus(), 50);
  }, []);

  const runOcrCore = async () => {
    if (!file) return;
    setError(null);
    setOcrLimitMsg(null);
    const priorRead = result?.readStatus;
    setResult(null);
    const out = await runOcrFromFile508(file, (msg) => setProgress(msg), {
      market,
      tileHeightPx: ocrTileH,
      provider: ocrProvider,
    });
    if (!out.ok) {
      if (out.code === "OCR_LIMIT") {
        setOcrLimitMsg(out.error);
        return;
      }
      setError(out.error);
      return;
    }
    setOcrReview({
      text: out.review.text,
      corrections: out.review.corrections,
      avgConfidence: out.review.avgConfidence,
      readStatus: priorRead === "partial" ? "partial" : undefined,
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
        save: true,
        productName: productName.trim().slice(0, 80),
        avgOcrConfidence: ocrReview.avgConfidence,
      });
      if (!out.ok) {
        if (out.status === 401) {
          setError(ERR_LOGIN_EXPIRED_495);
          window.location.href = `/login?next=${encodeURIComponent("/label-check/new")}`;
          return;
        }
        setError(out.error);
        return;
      }
      // unreadable 은 서버에서 저장 안 함 — savedId 없을 수 있음
      setResult(out.result);
      setSavedId(out.result.savedId ?? null);
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
    setOcrLimitMsg(null);
    try {
      const opts = {
        ...input,
        market,
        save: true as const,
        productName: productName.trim().slice(0, 80),
      };
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
        const out = await submitLabelCheckClient(file, opts, (msg) =>
          setProgress(msg || PROGRESS_RULES_507),
        );
        if (!out.ok) {
          if (out.status === 401) {
            setError(ERR_LOGIN_EXPIRED_495);
            window.location.href = `/login?next=${encodeURIComponent("/label-check/new")}`;
            return;
          }
          setError(out.error);
          return;
        }
        setResult(out.result);
        setSavedId(out.result.savedId ?? null);
        setCheckedOn(todayKo());
      } else if (pasteText.trim()) {
        setProgress(PROGRESS_RULES_507);
        const out = await submitLabelCheckTextClient(pasteText, {
          ...opts,
          scope: textScope,
        });
        if (!out.ok) {
          if (out.status === 401) {
            setError(ERR_LOGIN_EXPIRED_495);
            window.location.href = `/login?next=${encodeURIComponent("/label-check/new")}`;
            return;
          }
          setError(out.error);
          return;
        }
        setResult(out.result);
        setSavedId(out.result.savedId ?? null);
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
        save: false,
        productName: productName.trim().slice(0, 80),
      });
      if (!out.ok) {
        if (out.status === 401) {
          setError(ERR_LOGIN_EXPIRED_495);
          window.location.href = `/login?next=${encodeURIComponent("/label-check/new")}`;
          return;
        }
        setError(out.error);
        return;
      }
      setResult(out.result);
      setCheckedOn(todayKo());
    } finally {
      setBusy(false);
    }
  };

  const showUpload = !result && !ocrReview;

  return (
    <LabelSiteShell511>
      <LabelHeader511
        user={{ id: "member" }}
        logoutSlot={<LogoutButton />}
      />
      <CheckBusyOverlay511 busy={busy} />
      <main className="lc507 min-h-screen">
      <div className="lc507-wrap">
        {showUpload ? (
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
            showProductName
            productName={productName}
            onProductName={setProductName}
            busy={busy}
            progress={progress}
            onSubmit={() => void runCheck()}
            bothInputsHint={Boolean(file && pasteText.trim())}
            pasteTextareaRef={pasteRef}
            acceptImages
            ocrAvailable={ocrAvailable}
            onStartOcr={() => void startOcr()}
            ocrTransferNotice={ocrNotice}
          />
        ) : null}

        {ocrReview ? (
          <OcrReviewCard508
            text={ocrReview.text}
            onText={(t) => setOcrReview((p) => (p ? { ...p, text: t } : p))}
            corrections={ocrReview.corrections}
            busy={busy}
            onConfirm={() => void confirmOcr()}
            onCancel={() => setOcrReview(null)}
            transferNotice={ocrNotice}
            avgConfidence={ocrReview.avgConfidence}
            readStatus={ocrReview.readStatus}
            onFocusPaste={focusPaste}
          />
        ) : null}

        {ocrLimitMsg ? (
          <OcrLimitBanner509 message={ocrLimitMsg} onFocusPaste={focusPaste} />
        ) : null}

        {error ? (
          <p className="lc507-card" role="alert" style={{ borderColor: "var(--lc507-bad)" }}>
            {error}
          </p>
        ) : null}

        {result ? (
          <>
            <ResultView507
              result={result}
              productName={productName || null}
              checkedOn={checkedOn ?? undefined}
              isMember
              savedId={savedId}
              recheckText={recheckText}
              onRecheckText={setRecheckText}
              onRecheck={() => void recheck()}
              recheckBusy={busy}
              ocrAvailable={ocrAvailable}
              onStartOcr={() => void startOcr()}
              onFocusPaste={focusPaste}
            />
            <p className="lc507-fine lc507-print-hide">
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => {
                  setResult(null);
                  setSavedId(null);
                  setOcrReview(null);
                  setOcrLimitMsg(null);
                }}
              >
                새 점검하기
              </button>
            </p>
          </>
        ) : null}
      </div>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}
