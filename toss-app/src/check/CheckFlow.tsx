import { useCallback, useRef, useState } from "react";
import {
  submitLabelCheckClient,
  submitLabelCheckTextClient,
} from "@/lib/label-check/client-submit";
import {
  runOcrFromFile508,
  submitOcrReviewedText508,
} from "@/lib/label-check/client-ocr-submit";
import { isHeicFile508 } from "@/lib/label-check/client-ocr-prepare";
import { ERR_OCR_HEIC_508 } from "@/lib/label-check/ocr/constants";
import type { LabelCheckResult } from "@/lib/label-check/types";
import { SimpleResult } from "./SimpleResult";

type Phase = "form" | "ocr" | "busy" | "result";

export function CheckFlow() {
  const [rinseOff, setRinseOff] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [avgConf, setAvgConf] = useState<number | undefined>();
  const [result, setResult] = useState<LabelCheckResult | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  const opts = {
    rinseOff,
    functional,
    market: "KR" as const,
    save: false,
  };

  const focusPaste = useCallback(() => {
    pasteRef.current?.focus();
    setPhase("form");
  }, []);

  const runTextCheck = async (body: string) => {
    setPhase("busy");
    setProgress("점검 중");
    setError(null);
    setLimitMessage(null);
    const res = await submitLabelCheckTextClient(body, { ...opts, scope: "full" });
    setProgress(null);
    if (!res.ok) {
      setError(res.error);
      setPhase("form");
      return;
    }
    setResult(res.result);
    setPhase("result");
  };

  const onCheck = async () => {
    setError(null);
    setLimitMessage(null);
    setResult(null);

    if (file) {
      if (isHeicFile508(file)) {
        setError(ERR_OCR_HEIC_508);
        return;
      }
      setPhase("busy");
      setProgress("파일 읽는 중");
      const ocr = await runOcrFromFile508(file, (m) => setProgress(m), { market: "KR" });
      if (!ocr.ok) {
        if (ocr.code === "OCR_LIMIT") {
          setLimitMessage(ocr.error);
          setPhase("result");
          setProgress(null);
          return;
        }
        setError(ocr.error);
        setPhase("form");
        setProgress(null);
        return;
      }
      setOcrText(ocr.review.text);
      setAvgConf(ocr.review.avgConfidence);
      setPhase("ocr");
      setProgress(null);
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setError("파일 또는 문구를 넣어 주세요.");
      return;
    }
    await runTextCheck(trimmed);
  };

  const onConfirmOcr = async () => {
    setPhase("busy");
    setProgress("점검 중");
    setError(null);
    const res = await submitOcrReviewedText508(ocrText, {
      ...opts,
      avgOcrConfidence: avgConf,
    });
    setProgress(null);
    if (!res.ok) {
      setError(res.error);
      setPhase("ocr");
      return;
    }
    setResult(res.result);
    setPhase("result");
  };

  const onFileCheckPdf = async () => {
    if (!file) return;
    setPhase("busy");
    setProgress("점검 중");
    setError(null);
    setLimitMessage(null);
    const res = await submitLabelCheckClient(file, opts, (m) => setProgress(m));
    setProgress(null);
    if (!res.ok) {
      setError(res.error);
      setPhase("form");
      return;
    }
    setResult(res.result);
    setPhase("result");
  };

  const isPdf =
    !!file &&
    ((file.type || "").toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

  return (
    <section className="section">
      <h2>점검</h2>
      <p className="muted">시장: 한국 · 참고용 사전 점검</p>

      <div className="checks">
        <label>
          <input type="checkbox" checked={rinseOff} onChange={(e) => setRinseOff(e.target.checked)} />
          씻어내는 제품
        </label>
        <label>
          <input
            type="checkbox"
            checked={functional}
            onChange={(e) => setFunctional(e.target.checked)}
          />
          기능성
        </label>
      </div>

      <div className="row">
        <label className="file-btn">
          사진·PDF 선택
          <input
            type="file"
            accept="image/*,.heic,.heif,application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {file ? (
          <span className="muted">
            {file.name} ({file.size}B)
          </span>
        ) : null}
      </div>

      <p className="muted" style={{ marginTop: 12 }}>
        또는 문구 붙여넣기
      </p>
      <textarea
        ref={pasteRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="라벨·광고 문구를 붙여 넣어요"
        aria-label="문구 붙여넣기"
      />

      {error ? <p className="status-bad">{error}</p> : null}
      {progress ? <p className="muted">{progress}</p> : null}

      {phase === "ocr" ? (
        <div style={{ marginTop: 12 }}>
          <h2>읽은 글자 확인</h2>
          <p className="muted">필요하면 고친 뒤 점검해요.</p>
          <textarea value={ocrText} onChange={(e) => setOcrText(e.target.value)} aria-label="읽은 글자" />
          <div className="row">
            <button type="button" className="primary" onClick={() => void onConfirmOcr()}>
              확인 후 점검하기
            </button>
            <button type="button" onClick={() => setPhase("form")}>
              닫기
            </button>
          </div>
        </div>
      ) : null}

      {phase !== "ocr" ? (
        <div className="row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="primary"
            disabled={phase === "busy"}
            onClick={() => void onCheck()}
          >
            점검하기
          </button>
          {isPdf ? (
            <button type="button" disabled={phase === "busy"} onClick={() => void onFileCheckPdf()}>
              PDF 바로 점검
            </button>
          ) : null}
        </div>
      ) : null}

      {phase === "result" || limitMessage ? (
        <div style={{ marginTop: 16 }}>
          <SimpleResult result={result} limitMessage={limitMessage} onFocusPaste={focusPaste} />
        </div>
      ) : null}

      {phase !== "result" && !limitMessage ? (
        <p className="disclaimer">법적 판단이 아닌 사전 점검 도구입니다</p>
      ) : null}
    </section>
  );
}
