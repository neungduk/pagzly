"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { LabelSiteShell511, LabelHeader511, LabelFooter511 } from "@/components/label-check/ui-511";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    router.push("/login?reset=success");
    router.refresh();
  }

  if (checkingSession) {
    return null;
  }

  return (
    <LabelSiteShell511>
      <LabelHeader511 />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px 72px" }}>
        <div className="lc511-auth-card">
          {!hasSession ? (
            <>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>링크가 만료되었습니다</h1>
              <p style={{ margin: 0, fontSize: 15, color: "#5B6B65" }}>
                비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.
              </p>
              <Link href="/forgot-password" className="lc-cta lc-cta-solid" style={{ textAlign: "center" }}>
                비밀번호 찾기로 돌아가기
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>새 비밀번호 설정</h1>
              <p style={{ margin: 0, fontSize: 15, color: "#5B6B65" }}>새로 사용할 비밀번호를 입력해 주세요.</p>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label htmlFor="password">
                  새 비밀번호
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
                <label htmlFor="confirmPassword">
                  새 비밀번호 확인
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="6자 이상"
                  />
                </label>
                {error ? (
                  <p style={{ margin: 0, padding: 12, borderRadius: 8, background: "rgba(214,64,43,.12)", color: "#B3321F", fontSize: 14 }}>
                    {error}
                  </p>
                ) : null}
                <button type="submit" className="lc-cta lc-cta-solid lc-w-full" disabled={loading}>
                  {loading ? "변경 중..." : "비밀번호 변경"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <LabelFooter511 />
    </LabelSiteShell511>
  );
}
