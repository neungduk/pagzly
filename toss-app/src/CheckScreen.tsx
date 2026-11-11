import { useCallback, useEffect, useRef, useState } from "react";
import "@/components/label-check/ui-507/label-check-507.css";
import "@/components/label-check/ui-517/label-check-517.css";
import { OcrLimitBanner509 } from "@/components/label-check/ui-507";
import {
  CheckStart517,
  ResultView517,
  CheckBusyOverlay517,
  OcrReview517,
  useOcrThumbnail518,
} from "@/components/label-check/ui-517";
import type { OcrReviewLine517 } from "@/components/label-check/ui-517";
import { applyGatingToStaticResult518 } from "@/lib/label-check/sample-gating-518";
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
import type { OcrProviderId508 } from "@/lib/label-check/ocr/provider";
import { TOSS_ACCEPT, TOSS_SHOW_US_MARKET } from "./config";

type Stage = "start" | "ocr" | "result";

function todayKo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CheckScreen({ onTitleTap }: { onTitleTap: () => void }) {
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
  const histDepth = useRef(0);

  const pushStage = useCallback((stage: Stage) => {
    if (typeof window === "undefined") return;
    if (stage === "start") return;
    window.history.pushState({ tossLc: stage }, "");
    histDepth.current += 1;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      if (result) {
        setResult(null);
        setIsSample(false);
        if (histDepth.current > 0) histDepth.current -= 1;
        return;
      }
      if (ocrReview) {
        setOcrReview(null);
        if (histDepth.current > 0) histDepth.current -= 1;
        return;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [result, ocrReview]);

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
    setResult(
      applyGatingToStaticResult518(sampleResultA.result as LabelCheckResult, {
        productTypes: input.productTypes,
      }),
    );
    setSourceText(
      "피부 주름을 완전히 없애 주는 앰플. 비타민C 함유로 피부 재생을 돕고 칙칙함을 개선합니다.",
    );
    setCheckedOn(todayKo());
    pushStage("result");
  }, [input.productTypes, pushStage]);

  const focusPaste = useCallback(() => {
    setFile(null);
    setResult(null);
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
    setOcrAdOnly(false);
    const q = out.review;
    const blocked = Boolean(q.blockForLowQuality);
    setOcrQualityLabel(q.qualityLabel || null);
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
      notices: q.notices,
      qualityLabel: q.qualityLabel,
      detailPageHint: q.detailPageHint,
      ocrQuality: q.ocrQuality,
      blockForLowQuality: blocked,
    });
    pushStage("ocr");
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
        save: false,
      });
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setResult(out.result);
      setSourceText(ocrReview.text);
      setCheckedOn(todayKo());
      setOcrReview(null);
      pushStage("result");
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
          { ...input, market, save: false },
          (msg) => setProgress(msg || PROGRESS_RULES_507),
        );
        if (!out.ok) {
          setError(out.error);
          return;
        }
        setResult(out.result);
        setSourceText(out.sourceText ?? null);
        setCheckedOn(todayKo());
        pushStage("result");
      } else if (pasteText.trim()) {
        setProgress(PROGRESS_RULES_507);
        const out = await submitLabelCheckTextClient(pasteText, {
          ...input,
          market,
          scope: textScope,
          save: false,
        });
        if (!out.ok) {
          setError(out.error);
          return;
        }
        setResult(out.result);
        setSourceText(out.sourceText ?? pasteText);
        setCheckedOn(todayKo());
        pushStage("result");
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
      <CheckBusyOverlay517 busy={busy} />
      <main className="lc517-wrap">
        {!result ? (
          <>
            <div className="toss-hero" style={{ padding: "10px 0 22px" }}>
              <h1 onClick={onTitleTap}>
                라벨을 올리면, <span style={{ color: "#1D4ED8" }}>바로 읽어서</span> 점검해요
              </h1>
              <p className="toss-hero-sub">파일 하나면 충분해요. 설정은 아래에서 골라요.</p>
            </div>
            <CheckStart517
              touch
              accept={TOSS_ACCEPT}
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
                    onSuggestAdOnly={
                      ocrReview.detailPageHint ? () => setOcrAdOnly((v) => !v) : undefined
                    }
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
                if (!TOSS_SHOW_US_MARKET && m === "US") return;
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
              <p
                role="alert"
                style={{ padding: 16, borderRadius: 16, border: "1px solid #D6402B", background: "#fff" }}
              >
                {error}
              </p>
            ) : null}
            <ResultView517
              result={result}
              productName={isSample ? sampleResultA.meta.product : null}
              checkedOn={checkedOn ?? undefined}
              isMember={false}
              embedded
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
    </div>
  );
}
