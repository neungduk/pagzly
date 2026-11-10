"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import "@/components/label-check/ui-507/label-check-507.css";
import { UploadCard507, ResultView507 } from "@/components/label-check/ui-507";
import type { LabelCheckInput, LabelCheckResult, LabelMarket } from "@/lib/label-check/types";
import {
  assertClientPdfSize,
  submitLabelCheckClient,
  submitLabelCheckTextClient,
} from "@/lib/label-check/client-submit";
import { ERR_LOGIN_EXPIRED_495 } from "@/lib/label-check/member-constants";
import { issueKeysFromFindings506 } from "@/lib/label-check/compare-506";
import { PROGRESS_READ_507, PROGRESS_RULES_507 } from "@/lib/label-check/ui-status-507";

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

  const onFile = useCallback((f: File | null) => {
    setError(null);
    setResult(null);
    if (!f) {
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

  const runCheck = async () => {
    setBusy(true);
    setError(null);
    try {
      const opts = {
        ...input,
        market,
        save: true as const,
        productName: productName.trim().slice(0, 80),
      };
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
        setError("PDF를 선택하거나 문구를 붙여넣으세요.");
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
          <p className="text-sm font-semibold text-[var(--lc507-brand)]">
            <Link href="/label-check" className="underline-offset-2 hover:underline">
              표시사항 사전 점검
            </Link>
          </p>
          <Link href="/label-check/history" className="text-sm underline-offset-2 hover:underline">
            내 결과
          </Link>
        </header>

        {!result ? (
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
          />
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
            />
            <p className="lc507-fine lc507-print-hide">
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => {
                  setResult(null);
                  setSavedId(null);
                }}
              >
                새 점검하기
              </button>
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
