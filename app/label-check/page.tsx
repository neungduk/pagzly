"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "@/components/label-check/ui-507/label-check-507.css";
import "@/components/label-check/ui-517/label-check-517.css";
import { OcrLimitBanner509 } from "@/components/label-check/ui-507";
import { LabelSiteShell511, LabelFooter511 } from "@/components/label-check/ui-511";
import {
  CheckStart517,
  ResultView517,
  CheckBusyOverlay517,
  OcrReview517,
  useOcrThumbnail518,
} from "@/components/label-check/ui-517";
import type { OcrReviewLine517 } from "@/components/label-check/ui-517";
import { applyGatingToStaticResult518 } from "@/lib/label-check/sample-gating-518";
import Link from "next/link";
import type { LabelCheckInput, LabelCheckResult, LabelMarket } from "@/lib/label-check/types";
import {
  ERR_TOO_MANY_PAGES_485,
  NOTICE_PDF_AS_IMAGE_524,
  SAMPLE_BANNER_486,
} from "@/lib/label-check/types";
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
import type { OcrProviderId508 } from "@/lib/label-check/ocr/provider";
import { isPdfFile524, probePdfRoute524 } from "@/lib/label-check/client-pdf-route-524";

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
  const [sourceText, setSourceText] = useState<string | null>(null);
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
  const [ocrTileH, setOcrTileH] = useState(2400);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [ocrProvider, setOcrProvider] = useState<OcrProviderId508 | null>(null);
  const [ocrLimitMsg, setOcrLimitMsg] = useState<string | null>(null);
  const [ocrReview, setOcrReview] = useState<{
    text: string;
    corrections: string[];
    avgConfidence: number;
    readStatus?: "ok" | "partial" | "unreadable";
    /** 518 — 읽기 품질(화면 전용). 읽기 쪽이 채워 주면 그대로 전달 */
    lines?: OcrReviewLine517[];
    notices?: string[];
    qualityLabel?: string;
    detailPageHint?: string | null;
    ocrQuality?: {
      avgConfidence: number;
      lowLineCount: number;
      lineCount: number;
      renderScale?: number;
      tiles?: number;
    };
    blockForLowQuality?: boolean;
  } | null>(null);
  const [ocrQualityLabel, setOcrQualityLabel] = useState<string | null>(null);
  const [ocrAdOnly, setOcrAdOnly] = useState(false);
  const ocrThumb = useOcrThumbnail518(file, Boolean(ocrReview));
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);
  const contactEmail = labelContactEmail();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("market");
    if (q && q.toUpperCase() === "US") {
      setMarket("US");
      setInput((p) => ({ ...p, market: "US" }));
    }
  }, []);

  useEffect(() => {
    void fetchOcrAvailable508(market).then((r) => {
      setOcrAvailable(r.available);
      setOcrTileH(r.tileHeightPx);
      setOcrNotice(r.notice || null);
      setOcrProvider(r.provider);
    });
  }, [market]);

  const onFile = useCallback((f: File | null) => {
    setResult(null);
    setSourceText(null);
    setIsSample(false);
    setError(null);
    setOcrLimitMsg(null);
    setOcrReview(null);
    setOcrQualityLabel(null);
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
    // 518 — 샘플도 513 게이팅을 거친다(옵션 미선택 항목은 '뺀 항목', 개정안은 '참고')
    setResult(
      applyGatingToStaticResult518(sampleResultA.result as LabelCheckResult, {
        productTypes: input.productTypes,
      }),
    );
    setSourceText(
      "피부 주름을 완전히 없애 주는 앰플. 비타민C 함유로 피부 재생을 돕고 칙칙함을 개선합니다.",
    );
    setCheckedOn(todayKo());
  }, [input.productTypes]);

  const focusPaste = useCallback(() => {
    setFile(null);
    setResult(null);
    setOcrReview(null);
    setOcrLimitMsg(null);
    setError(null);
    window.setTimeout(() => pasteRef.current?.focus(), 50);
  }, []);

  const runOcrCore = async (opts?: { pdfAsImage?: boolean }) => {
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
    setOcrAdOnly(false);
    const q = out.review;
    const blocked = Boolean(q.blockForLowQuality);
    setOcrQualityLabel(q.qualityLabel || null);
    const notices = [...(q.notices || [])];
    if (opts?.pdfAsImage && !notices.includes(NOTICE_PDF_AS_IMAGE_524)) {
      notices.unshift(NOTICE_PDF_AS_IMAGE_524);
    }
    setOcrReview({
      text: out.review.text,
      corrections: out.review.corrections,
      avgConfidence: out.review.avgConfidence,
      readStatus: blocked
        ? "unreadable"
        : priorRead === "partial" || q.prepareMeta?.truncated
          ? "partial"
          : undefined,
      lines: q.lines,
      notices,
      qualityLabel: q.qualityLabel,
      detailPageHint: q.detailPageHint,
      ocrQuality: q.ocrQuality,
      blockForLowQuality: blocked,
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
    if (ocrReview.blockForLowQuality || ocrReview.readStatus === "unreadable") {
      setError("글자를 제대로 읽지 못했어요. 다시 찍거나 PDF로 올려 주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setProgress(PROGRESS_RULES_507);
      const out = await submitOcrReviewedText508(ocrReview.text, {
        ...input,
        market,
        scope: ocrAdOnly ? "ad_only" : "full",
        avgOcrConfidence: ocrReview.avgConfidence,
      });
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setResult(out.result);
      setSourceText(ocrReview.text);
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
      if (file && isPdfFile524(file) && ocrAvailable) {
        setProgress(PROGRESS_READ_507);
        try {
          const route = await probePdfRoute524(file);
          if (route === "ocr") {
            await runOcrCore({ pdfAsImage: true });
            return;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === "TOO_MANY_PAGES") {
            setError(ERR_TOO_MANY_PAGES_485);
            return;
          }
          /* unknown/실패 → 아래 글자 층 경로 */
        }
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
        setSourceText(out.sourceText ?? null);
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
        setSourceText(out.sourceText ?? pasteText);
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
          <Link href="/login">로그인</Link>
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
            <CheckStart517
                reviewSlot={
                  ocrReview ? (
                    <OcrReview517
                      text={ocrReview.text}
                      onChange={(t) => setOcrReview((p) => (p ? { ...p, text: t } : p))}
                      onConfirm={() => void confirmOcr()}
                      onCancel={() => setOcrReview(null)}
                      thumbnailUrl={ocrThumb}
                      lines={ocrReview.lines}
                      notices={ocrReview.notices}
                      qualityLabel={ocrReview.qualityLabel}
                      detailPageHint={ocrReview.detailPageHint}
                      onSuggestAdOnly={ocrReview.detailPageHint ? () => setOcrAdOnly((v) => !v) : undefined}
                      adOnlySelected={ocrAdOnly}
                      transferNotice={ocrNotice}
                      busy={busy}
                      corrections={ocrReview.corrections}
                      avgConfidence={ocrReview.avgConfidence}
                      readStatus={ocrReview.readStatus}
                      onFocusPaste={focusPaste}
                    />
                  ) : undefined
                }
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
                ocrTransferNotice={ocrNotice}
              />
            <p style={{ marginTop: 16, fontSize: 13, color: "#6A6D74" }}>
              <button type="button" className="underline-offset-2 hover:underline" onClick={showSample}>
                샘플 결과 보기
              </button>
              {contactEmail ? (
                <>
                  {" · "}
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
                    {copied ? "복사됨" : `문의 ${contactEmail}`}
                  </button>
                </>
              ) : null}
            </p>
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
            {isSample ? <p style={{ fontSize: 13, color: "#6A6D74" }}>{SAMPLE_BANNER_486}</p> : null}
            {error ? (
              <p role="alert" style={{ padding: 16, borderRadius: 16, border: "1px solid #D6402B", background: "#fff" }}>
                {error}
              </p>
            ) : null}
            <ResultView517
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
              sourceText={sourceText}
              fileLabel={file?.name ?? (isSample ? "샘플" : null)}
              ocrQualityLabel={ocrQualityLabel}
            />
          </>
        )}
      </main>
      <LabelFooter511 />
    </div>
  );
}
