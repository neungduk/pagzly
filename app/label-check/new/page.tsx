"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "@/components/label-check/ui-507/label-check-507.css";
import "@/components/label-check/ui-517/label-check-517.css";
import { OcrReviewCard508, OcrLimitBanner509 } from "@/components/label-check/ui-507";
import { LabelFooter511 } from "@/components/label-check/ui-511";
import {
  CheckStart517,
  ResultView517,
  CheckBusyOverlay517,
} from "@/components/label-check/ui-517";
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
  const [sourceText, setSourceText] = useState<string | null>(null);
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
    setSourceText(null);
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
      setSourceText(ocrReview.text);
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
        setSourceText(out.sourceText ?? null);
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
        setSourceText(out.sourceText ?? pasteText);
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
      setSourceText(out.sourceText ?? recheckText);
      setCheckedOn(todayKo());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lc517">
      <div className="lc517-wash" aria-hidden>
        <i className="a" />
        <i className="b" />
      </div>
      <header className="lc517-header">
        <Link href="/" className="lc517-brand">
          Pagzly
        </Link>
        <nav className="lc517-nav" aria-label="주요">
          <Link href="/label-check/history">내 결과</Link>
          <LogoutButton />
        </nav>
      </header>
      <CheckBusyOverlay517 busy={busy} />
      <main className="lc517-wrap">
        {!result ? (
          <>
            <div style={{ padding: "10px 0 22px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 40,
                  lineHeight: 1.25,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  textWrap: "balance",
                }}
              >
                라벨을 올리면, <span style={{ color: "#1D4ED8" }}>바로 읽어서</span> 점검해요
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 16, color: "#4A4D54" }}>
                파일 하나면 충분해요. 설정은 오른쪽에서 고르세요.
              </p>
            </div>
            {!ocrReview ? (
              <CheckStart517
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
            ) : (
              <div className="lc517-stage-card" style={{ padding: 18 }}>
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
              </div>
            )}
            {ocrLimitMsg ? <OcrLimitBanner509 message={ocrLimitMsg} onFocusPaste={focusPaste} /> : null}
            {error ? (
              <p
                role="alert"
                style={{
                  marginTop: 12,
                  padding: 16,
                  borderRadius: 16,
                  background: "#fff",
                  border: "1px solid #D6402B",
                }}
              >
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <>
            {error ? (
              <p
                role="alert"
                style={{ padding: 16, borderRadius: 16, border: "1px solid #D6402B", background: "#fff" }}
              >
                {error}
              </p>
            ) : null}
            <ResultView517
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
              sourceText={sourceText}
              fileLabel={file?.name}
            />
            <p style={{ marginTop: 16, fontSize: 13, color: "#6A6D74" }} className="lc507-print-hide">
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => {
                  setResult(null);
                  setSavedId(null);
                  setSourceText(null);
                  setOcrReview(null);
                  setOcrLimitMsg(null);
                }}
              >
                새 점검하기
              </button>
            </p>
          </>
        )}
      </main>
      <LabelFooter511 />
    </div>
  );
}
