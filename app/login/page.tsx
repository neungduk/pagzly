"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import KakaoLoginButton from "@/components/KakaoLoginButton";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { createClient } from "@/lib/supabase";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { safeLabelCheckNext } from "@/lib/label-check/safe-next";
import { isDetailPageEnabled } from "@/lib/feature-flags";
import { LabelSiteShell511, LabelHeader511, LabelFooter511 } from "@/components/label-check/ui-511";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const nextPath = safeLabelCheckNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const userId = data.user?.id;
    // label-check 복귀(next)면 온보딩 강제 생략. 그 외는 기존 흐름.
    if (
      !nextPath &&
      userId &&
      isDetailPageEnabled() &&
      !(await hasCompletedOnboarding(supabase, userId))
    ) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    router.push(nextPath || "/");
    router.refresh();
  }

  return (
    <LabelSiteShell511>
      <LabelHeader511 />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px 72px" }}>
        <div className="lc511-auth-card">
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>로그인</h1>
          <p style={{ margin: 0, fontSize: 15, color: "#5B6B65" }}>Pagzly 계정으로 로그인하세요</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <KakaoLoginButton label="카카오로 로그인" onError={setError} />
            <GoogleLoginButton label="Google로 로그인" onError={setError} />
            <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 13, color: "#5B6B65" }}>또는</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label htmlFor="email">
              이메일
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label htmlFor="password">
              비밀번호
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <div style={{ textAlign: "right" }}>
              <Link href="/forgot-password" style={{ fontSize: 13, color: "#5B6B65" }}>
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            {resetSuccess && !error ? (
              <p style={{ margin: 0, padding: 12, borderRadius: 8, background: "rgba(31,122,86,.12)", color: "#1F7A56", fontSize: 14 }}>
                비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
              </p>
            ) : null}
            {error ? (
              <p style={{ margin: 0, padding: 12, borderRadius: 8, background: "rgba(214,64,43,.12)", color: "#B3321F", fontSize: 14 }}>
                {error}
              </p>
            ) : null}
            <button type="submit" className="lc-cta lc-cta-solid lc-w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "#5B6B65" }}>
            계정이 없으신가요?{" "}
            <Link href="/signup" style={{ fontWeight: 700, color: "#0F3D36" }}>
              회원가입
            </Link>
          </p>
        </div>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
