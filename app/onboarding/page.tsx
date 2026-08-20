"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  BUSINESS_TYPE_OPTIONS,
  MONTHLY_VOLUME_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
} from "@/lib/onboarding";

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const id = `${name}-${option}`;
        const selected = value === option;
        return (
          <label
            key={option}
            htmlFor={id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
              selected
                ? "border-registration-red bg-registration-red/5 text-ink"
                : "border-line bg-white text-ink/80 hover:border-ink/30"
            }`}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option}
              checked={selected}
              onChange={() => onChange(option)}
              className="accent-registration-red"
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const progress = (step / 3) * 100;

  function goNext() {
    setError(null);
    if (step === 1 && !businessType) {
      setError("비즈니스 형태를 선택해 주세요.");
      return;
    }
    if (step === 2 && !monthlyVolume) {
      setError("월 제작 개수를 선택해 주세요.");
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  }

  async function handleSubmit() {
    setError(null);
    if (!referralSource) {
      setError("유입 경로를 선택해 주세요.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const { error: upsertError } = await supabase.from("user_onboarding").upsert(
      {
        user_id: user.id,
        business_type: businessType,
        monthly_volume: monthlyVolume,
        referral_source: referralSource,
        store_url: storeUrl.trim() || null,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    setLoading(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    router.push("/create");
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-col bg-paper text-ink">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-registration-red/5 to-paper" />

      <header className="px-6 py-6">
        <Link href="/">
          <PagzlyLogo className="h-8 w-auto" />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-ink/50">
              {step} / 3
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-registration-red transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {step === 1 ? (
              <>
                <h1 className="mt-6 text-2xl font-bold text-ink">비즈니스 형태</h1>
                <p className="mt-2 text-sm text-ink/60">
                  Pagzly를 어떻게 쓰시는지 알려 주세요
                </p>
                <div className="mt-6">
                  <RadioGroup
                    name="business_type"
                    options={BUSINESS_TYPE_OPTIONS}
                    value={businessType}
                    onChange={setBusinessType}
                  />
                </div>
                {businessType ? (
                  <div className="mt-5">
                    <label
                      htmlFor="storeUrl"
                      className="block text-sm font-medium text-ink/80"
                    >
                      스토어 링크 (선택)
                    </label>
                    <input
                      id="storeUrl"
                      type="url"
                      value={storeUrl}
                      onChange={(e) => setStoreUrl(e.target.value)}
                      placeholder="https://"
                      className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm outline-none transition-colors focus:border-registration-red focus:ring-2 focus:ring-registration-red/20"
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h1 className="mt-6 text-2xl font-bold text-ink">월 제작 개수</h1>
                <p className="mt-2 text-sm text-ink/60">
                  한 달에 상세페이지를 몇 개 정도 만드시나요?
                </p>
                <div className="mt-6">
                  <RadioGroup
                    name="monthly_volume"
                    options={MONTHLY_VOLUME_OPTIONS}
                    value={monthlyVolume}
                    onChange={setMonthlyVolume}
                  />
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h1 className="mt-6 text-2xl font-bold text-ink">유입 경로</h1>
                <p className="mt-2 text-sm text-ink/60">Pagzly를 어떻게 알게 되셨나요?</p>
                <div className="mt-6">
                  <RadioGroup
                    name="referral_source"
                    options={REFERRAL_SOURCE_OPTIONS}
                    value={referralSource}
                    onChange={setReferralSource}
                  />
                </div>
              </>
            ) : null}

            {error ? (
              <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep((current) => current - 1);
                  }}
                  className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
                >
                  이전
                </button>
              ) : null}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink/90"
                >
                  다음
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-registration-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-registration-red/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "저장 중..." : "시작하기"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
