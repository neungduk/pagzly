import { useCallback, useEffect, useRef, useState } from "react";
import "@/components/label-check/ui-507/label-check-507.css";
import "@/components/label-check/ui-517/label-check-517.css";
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
import { ERR_TOO_MANY_PAGES_485, NOTICE_PDF_AS_IMAGE_524 } from "@/lib/label-check/types";
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
import { TOSS_ACCEPT, TOSS_SHOW_US_MARKET } from "./config";
import { TOSS_COPY } from "./copy";
import { demoEnabled } from "./demo/enabled";
import { applyDemo, isDemoName } from "./demo/applyDemo";
import { IconChevronRight, IconRefresh, IconWarn } from "./ui/icons";

type Stage = "start" | "ocr" | "result";

function todayKo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CheckScreen({
  onTitleTap,
  demoName,
}: {
  onTitleTap: () => void;
  demoName?: string | null;
}) {
  const [demoTextTab, setDemoTextTab] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const busyLock = useRef(false);
  const reqSeq = useRef(0);

  const pushStage = useCallback((stage: Stage) => {
    if (typeof window === "undefined") return;
    if (stage === "start") return;
    window.history.pushState({ tossLc: stage }, "");
    histDepth.current += 1;
  }, []);

  useEffect(() => {
    const root = document.querySelector(".toss-app");
    if (!root) return;
    root.classList.toggle("toss-settings-open", settingsOpen);
  }, [settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const sheet = document.querySelector<HTMLElement>(".toss-app .lc517-aside");
    if (!sheet) return;
    const focusables = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        if (histDepth.current > 0) window.history.back();
        return;
      }
      if (e.key !== "Tab" || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      if (settingsOpen) {
        setSettingsOpen(false);
        if (histDepth.current > 0) histDepth.current -= 1;
        return;
      }
      if (result) {
        setResult(null);
        setIsSample(false);
        reqSeq.current += 1;
        busyLock.current = false;
        setBusy(false);
        if (histDepth.current > 0) histDepth.current -= 1;
        return;
      }
      if (ocrReview) {
        setOcrReview(null);
        reqSeq.current += 1;
        busyLock.current = false;
        setBusy(false);
        if (histDepth.current > 0) histDepth.current -= 1;
        return;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [result, ocrReview, settingsOpen]);

  const openSettings = () => {
    setSettingsOpen(true);
    window.history.pushState({ tossLc: "settings" }, "");
    histDepth.current += 1;
  };

  const settingsSummary = [
    market === "US" ? "미국" : "한국",
    input.rinseOff ? "씻어내는 제품" : "안 씻어내는 제품",
    input.functional ? "기능성" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const resetToStart = () => {
    setResult(null);
    setFile(null);
    setPasteText("");
    setSourceText(null);
    setIsSample(false);
    setOcrReview(null);
    setError(null);
    setOcrLimitMsg(null);
    setRecheckText("");
    setSettingsOpen(false);
  };

  useEffect(() => {
    void fetchOcrAvailable508(market).then((r) => {
      setOcrAvailable(r.available);
      setOcrTileH(r.tileHeightPx);
      setOcrNotice(r.notice || null);
      setOcrProvider(r.provider);
    });
  }, [market]);

  useEffect(() => {
    if (!demoEnabled() || !demoName || !isDemoName(demoName)) return;
    let cancelled = false;
    void (async () => {
      await applyDemo(demoName, {
        setFile,
        setPasteText,
        setBusy,
        setProgress,
        setError,
        setResult,
        setIsSample,
        setSourceText,
        setCheckedOn,
        setOcrLimitMsg,
        setOcrReview,
        setOcrQualityLabel,
        setTextTab: setDemoTextTab,
      });
      if (cancelled) return;
      if (demoName === "result-open") {
        window.setTimeout(() => {
          const btn = document.querySelector<HTMLElement>(
            '.lc517-row button[aria-expanded="false"], .lc517 button[aria-expanded="false"]',
          );
          btn?.click();
        }, 500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoName]);

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
    if (busyLock.current) return;
    busyLock.current = true;
    const myReq = ++reqSeq.current;
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
          if (myReq !== reqSeq.current) return;
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
          /* unknown → 글자 층 경로 */
        }
      }
      if (file) {
        setProgress(PROGRESS_READ_507);
        const out = await submitLabelCheckClient(
          file,
          { ...input, market, save: false },
          (msg) => setProgress(msg || PROGRESS_RULES_507),
        );
        if (myReq !== reqSeq.current) return;
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
        if (myReq !== reqSeq.current) return;
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
      if (myReq === reqSeq.current) {
        setProgress(null);
        setBusy(false);
        busyLock.current = false;
      }
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
      <CheckBusyOverlay517 busy={busy} useIcons />
      {settingsOpen ? (
        <button
          type="button"
          aria-label="설정 닫기"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 36,
            background: "transparent",
            border: 0,
          }}
          onClick={() => {
            setSettingsOpen(false);
            if (histDepth.current > 0) window.history.back();
          }}
        />
      ) : null}
      <main className="lc517-wrap">
        {!result ? (
          <>
            {!ocrReview ? (
              <div className="toss-hero">
                <h1 onClick={onTitleTap}>
                  <span className="toss-hero-l1">{TOSS_COPY.heroLine1}</span>
                  <span className="toss-hero-l2">
                    <span style={{ color: "#1D4ED8" }}>{TOSS_COPY.heroLine2Before}</span>
                    {TOSS_COPY.heroLine2After}
                  </span>
                </h1>
                <p className="toss-hero-sub">{TOSS_COPY.heroSub}</p>
              </div>
            ) : null}
            {error ? (
              <div className="toss-alert-card" role="alert" style={{ marginBottom: 12 }}>
                <IconWarn size={28} style={{ color: "#d6402b" }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 800 }}>
                    {/HEIC|heic/.test(error) ? TOSS_COPY.heicTitle : TOSS_COPY.errorTitle}
                  </p>
                  <p style={{ margin: "6px 0 0", color: "#6a6d74", fontSize: 14, lineHeight: 1.55 }}>
                    {/HEIC|heic/.test(error) ? TOSS_COPY.heicBody : "잠시 후 다시 시도해 주세요."}
                  </p>
                  {/HEIC|heic/.test(error) ? (
                    <p className="toss-heic-hint">아래에서 JPG·PNG·WEBP 파일을 다시 골라 주세요.</p>
                  ) : null}
                  {/HEIC|heic/.test(error) ? null : (
                    <button
                      type="button"
                      className="toss-alert-retry"
                      onClick={() => {
                        setError(null);
                        if (file || pasteText.trim()) void runCheck();
                      }}
                    >
                      <IconRefresh size={18} />
                      {TOSS_COPY.errorRetry}
                    </button>
                  )}
                </div>
              </div>
            ) : null}
            <CheckStart517
              touch
              deferMobileCta
              accept={TOSS_ACCEPT}
              initialTab={demoTextTab ? "text" : undefined}
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
                    title={TOSS_COPY.ocrTitle}
                    desc={TOSS_COPY.ocrDesc}
                    useIcons
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
            {!ocrReview ? (
              <>
                <button type="button" className="toss-sample-cta" onClick={showSample}>
                  <span className="dots" aria-hidden>
                    <i style={{ background: "#ff5a42" }} />
                    <i style={{ background: "#e0a12b" }} />
                    <i style={{ background: "#2fb67e" }} />
                  </span>
                  <span className="label">{TOSS_COPY.sampleCtaTitle}</span>
                  <IconChevronRight size={20} />
                </button>
                <button type="button" className="toss-settings-summary" onClick={openSettings}>
                  <span>{TOSS_COPY.settingsSummary}</span>
                  <span className="muted">{settingsSummary}</span>
                  <IconChevronRight size={18} />
                </button>
                <p className="toss-foot-note">
                  {TOSS_COPY.saveNote}
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
                        {copied ? "복사했어요" : `문의 ${contactEmail}`}
                      </button>
                    </>
                  ) : null}
                </p>
              </>
            ) : null}
            {ocrLimitMsg ? (
              <div className="toss-limit-card" role="alert">
                <p style={{ margin: 0, fontWeight: 800 }}>{TOSS_COPY.limitTitle}</p>
                <p style={{ margin: "8px 0 0", color: "#6a6d74", fontSize: 14, lineHeight: 1.55 }}>
                  문구를 붙여넣어 이어서 점검할 수 있어요.
                </p>
                <button type="button" className="toss-reset" style={{ marginTop: 12 }} onClick={focusPaste}>
                  {TOSS_COPY.limitCta}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {isSample ? (
              <div className="toss-sample-banner">
                <span>{TOSS_COPY.sampleBanner}</span>
                <button type="button" onClick={resetToStart}>
                  {TOSS_COPY.sampleBannerCta}
                </button>
              </div>
            ) : null}
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
              cleanHeadline={TOSS_COPY.cleanHeadline}
              cleanNote={TOSS_COPY.cleanNote}
              unreadablePhotoLabel={TOSS_COPY.unreadableRetryPhoto}
              unreadablePasteLabel={TOSS_COPY.unreadableRetryPaste}
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
            <button type="button" className="toss-reset" onClick={resetToStart}>
              {TOSS_COPY.resetOther}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
