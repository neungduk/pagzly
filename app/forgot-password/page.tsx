"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { LabelSiteShell511, LabelHeader511, LabelFooter511 } from "@/components/label-check/ui-511";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (resetError && resetError.status && resetError.status < 500 && resetError.message.toLowerCase().includes("email")) {
      setError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }
    setSent(true);
  }

  return (
    <LabelSiteShell511>
      <LabelHeader511 />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px 72px" }}>
        <div className="lc511-auth-card">
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>비밀번호 찾기</h1>
          <p style={{ margin: 0, fontSize: 15, color: "#5B6B65" }}>
            가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다.
          </p>

          {sent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ margin: 0, padding: 12, borderRadius: 8, background: "rgba(15,61,54,.08)", color: "#0F3D36", fontSize: 14 }}>
                입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요.
              </p>
              <Link href="/login" style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#0F3D36" }}>
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
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
              {error ? (
                <p style={{ margin: 0, padding: 12, borderRadius: 8, background: "rgba(214,64,43,.12)", color: "#B3321F", fontSize: 14 }}>
                  {error}
                </p>
              ) : null}
              <button type="submit" className="lc-cta lc-cta-solid lc-w-full" disabled={loading}>
                {loading ? "전송 중..." : "재설정 링크 받기"}
              </button>
              <p style={{ margin: 0, textAlign: "center", fontSize: 14 }}>
                <Link href="/login" style={{ fontWeight: 700, color: "#0F3D36" }}>
                  로그인으로 돌아가기
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}
