"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import KakaoLoginButton from "@/components/KakaoLoginButton";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { createClient } from "@/lib/supabase";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { LabelSiteShell511, LabelHeader511, LabelFooter511 } from "@/components/label-check/ui-511";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session && data.user) {
      if (!(await hasCompletedOnboarding(supabase, data.user.id))) {
        router.push("/onboarding");
        router.refresh();
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    setMessage(
      "회원가입이 완료되었습니다. 가입하신 이메일로 인증 링크를 보냈습니다. 이메일을 확인한 후 로그인해 주세요.",
    );
  }

  return (
    <LabelSiteShell511>
      <LabelHeader511 />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px 72px" }}>
        <div className="lc511-auth-card">
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>회원가입</h1>
          <p style={{ margin: 0, fontSize: 15, color: "#5B6B65" }}>Pagzly를 시작하려면 계정을 만드세요</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <KakaoLoginButton label="카카오로 시작하기" onError={setError} />
            <GoogleLoginButton label="Google로 시작하기" onError={setError} />
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
              />
            </label>
            {error ? (
              <p style={{ margin: 0, padding: 12, borderRadius: 8, background: "rgba(214,64,43,.12)", color: "#B3321F", fontSize: 14 }}>
                {error}
              </p>
            ) : null}
            {message ? (
              <p style={{ margin: 0, padding: 12, borderRadius: 8, background: "rgba(15,61,54,.08)", color: "#0F3D36", fontSize: 14 }}>
                {message}
              </p>
            ) : null}
            <button type="submit" className="lc-cta lc-cta-solid lc-w-full" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "#5B6B65" }}>
            이미 계정이 있으신가요?{" "}
            <Link href="/login" style={{ fontWeight: 700, color: "#0F3D36" }}>
              로그인
            </Link>
          </p>
        </div>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}
