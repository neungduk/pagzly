"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ResultPanel } from "@/components/label-check/ResultPanel";
import type { LabelCheckResult, LabelMarket } from "@/lib/label-check/types";
import { DISCLAIMER_483 } from "@/lib/label-check/types";
import {
  assertClientPdfSize,
  submitLabelCheckClient,
} from "@/lib/label-check/client-submit";
import { ERR_LOGIN_EXPIRED_495 } from "@/lib/label-check/member-constants";

function todayKo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LabelCheckNewPage() {
  const [step, setStep] = useState(1);
  const [market, setMarket] = useState<LabelMarket>("KR");
  const [rinseOff, setRinseOff] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [imported, setImported] = useState(false);
  const [professionalUse, setProfessionalUse] = useState(false);
  const [hazardous, setHazardous] = useState(false);
  const [otcDrugLike, setOtcDrugLike] = useState(false);
  const [productName, setProductName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabelCheckResult | null>(null);
  const [checkedOn, setCheckedOn] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

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

  const submit = async () => {
    if (!file) {
      setError("PDF를 선택하세요.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setStep(5);
    try {
      const out = await submitLabelCheckClient(
        file,
        {
          rinseOff,
          functional,
          market,
          imported,
          professionalUse,
          hazardous,
          otcDrugLike,
          save: true,
          productName: productName.trim().slice(0, 80),
        },
        setProgress,
      );
      if (!out.ok) {
        if (out.status === 401) {
          setError(ERR_LOGIN_EXPIRED_495);
          window.location.href = `/login?next=${encodeURIComponent("/label-check/new")}`;
          return;
        }
        setError(out.error);
        setStep(4);
        return;
      }
      setResult(out.result);
      setSavedId(out.result.savedId ?? null);
      setCheckedOn(todayKo());
      setStep(6);
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  return (
    <main className="lc-page min-h-screen bg-[#F7F4EE] text-[#1B1B18]">
      <div className="lc-shell mx-auto w-full max-w-3xl px-4 py-10">
        <header className="mb-6 print:hidden">
          <p className="text-sm font-semibold tracking-wide text-[#6B5A2E]">
            <Link href="/label-check" className="underline-offset-2 hover:underline">
              표시사항 사전 점검
            </Link>
            {" · "}검수 신청
          </p>
          <h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight">검수 신청</h1>
          <p className="mt-2 break-words text-sm text-[#4A3F24]">{DISCLAIMER_483}</p>
          <nav className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/label-check/history" className="underline-offset-2 hover:underline">
              내 결과
            </Link>
          </nav>
        </header>

        {step < 6 ? (
          <section className="space-y-4 rounded-2xl border border-[#E5DCC8] bg-white p-5 shadow-sm print:hidden">
            <p className="text-xs text-[#666]">단계 {Math.min(step, 5)} / 5</p>

            {step === 1 ? (
              <fieldset className="space-y-2 text-sm">
                <legend className="font-semibold">① 시장</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="market"
                    checked={market === "KR"}
                    onChange={() => setMarket("KR")}
                  />
                  한국
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="market"
                    checked={market === "US"}
                    onChange={() => setMarket("US")}
                  />
                  미국
                </label>
                <button
                  type="button"
                  className="mt-3 rounded-full bg-[#1B1B18] px-4 py-2 text-sm font-semibold text-[#FAF8F3]"
                  onClick={() => setStep(2)}
                >
                  다음
                </button>
              </fieldset>
            ) : null}

            {step === 2 ? (
              <fieldset className="space-y-2 text-sm">
                <legend className="font-semibold">② 옵션</legend>
                {market === "KR" ? (
                  <>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="rinse" checked={!rinseOff} onChange={() => setRinseOff(false)} />
                      안 씻어내는 제품
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="rinse" checked={rinseOff} onChange={() => setRinseOff(true)} />
                      씻어내는 제품
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={functional}
                        onChange={(e) => setFunctional(e.target.checked)}
                      />
                      기능성화장품
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={imported} onChange={(e) => setImported(e.target.checked)} />
                      수입품
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={professionalUse}
                        onChange={(e) => setProfessionalUse(e.target.checked)}
                      />
                      전문가용
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hazardous}
                        onChange={(e) => setHazardous(e.target.checked)}
                      />
                      에어로졸/아동용 등 위험 제품
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={otcDrugLike}
                        onChange={(e) => setOtcDrugLike(e.target.checked)}
                      />
                      OTC 의약품 성격
                    </label>
                  </>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => setStep(1)}>
                    이전
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-[#1B1B18] px-4 py-2 text-sm font-semibold text-[#FAF8F3]"
                    onClick={() => setStep(3)}
                  >
                    다음
                  </button>
                </div>
              </fieldset>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3 text-sm">
                <label className="block font-semibold">
                  ③ 제품명 (선택)
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    maxLength={80}
                    className="mt-2 block w-full rounded-lg border border-[#E5DCC8] px-3 py-2 font-normal"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded-full border px-4 py-2" onClick={() => setStep(2)}>
                    이전
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-[#1B1B18] px-4 py-2 font-semibold text-[#FAF8F3]"
                    onClick={() => setStep(4)}
                  >
                    다음
                  </button>
                </div>
              </div>
            ) : null}

            {step === 4 || step === 5 ? (
              <div className="space-y-3 text-sm">
                <label className="block font-semibold" htmlFor="lc-new-pdf">
                  ④ PDF 업로드
                  <input
                    id="lc-new-pdf"
                    type="file"
                    accept="application/pdf,.pdf"
                    className="mt-2 block w-full font-normal"
                    aria-label="PDF 파일 선택"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") (e.target as HTMLInputElement).click();
                    }}
                  />
                </label>
                {file ? <p className="text-xs text-[#666]">선택됨 · {(file.size / 1024).toFixed(1)} KB</p> : null}
                {step === 5 && busy ? (
                  <p className="text-sm font-semibold">⑤ {progress || "검수 중…"}</p>
                ) : null}
                {error ? (
                  <p className="break-words text-sm text-[#9B1C1C]" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2"
                    onClick={() => setStep(3)}
                    disabled={busy}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    disabled={busy || !file}
                    className="rounded-full bg-[#1B1B18] px-4 py-2 font-semibold text-[#FAF8F3] disabled:opacity-40"
                    onClick={() => void submit()}
                  >
                    {busy ? progress || "검수 중…" : "검수 시작"}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {result && step === 6 ? (
          <>
            {savedId ? (
              <p className="mb-3 text-sm text-[#4A3F24] print:hidden">
                요약이 저장되었습니다.{" "}
                <Link href="/label-check/history" className="underline-offset-2 hover:underline">
                  내 결과 보기
                </Link>
              </p>
            ) : null}
            <ResultPanel
              result={result}
              printTitle={productName.trim() || "제품명 미입력"}
              checkedOn={checkedOn ?? todayKo()}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
