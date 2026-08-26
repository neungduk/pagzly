"use client";

import Link from "next/link";
import { useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import { createClient } from "@/lib/supabase";

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

    // 계정 존재 여부를 노출하지 않기 위해 에러가 있어도 대부분 성공 화면으로 처리.
    // 단, 이메일 형식 오류처럼 명백한 클라이언트 실수는 그대로 보여줌.
    if (resetError && resetError.status && resetError.status < 500 && resetError.message.toLowerCase().includes("email")) {
      setError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }
    setSent(true);
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
            <h1 className="text-2xl font-bold text-ink">비밀번호 찾기</h1>
            <p className="mt-2 text-sm text-ink/60">
              가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다.
            </p>

            {sent ? (
              <div className="mt-8 space-y-6">
                <p className="rounded-lg bg-registration-red/10 px-4 py-3 text-sm text-registration-red">
                  입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함(스팸함
                  포함)을 확인해 주세요.
                </p>
                <Link
                  href="/login"
                  className="block text-center text-sm font-medium text-ink/60 hover:text-registration-red"
                >
                  로그인으로 돌아가기
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-ink/80"
                  >
                    이메일
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm outline-none transition-colors focus:border-registration-red focus:ring-2 focus:ring-registration-red/20"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "전송 중..." : "재설정 링크 받기"}
                </button>

                <p className="text-center text-sm text-ink/60">
                  <Link
                    href="/login"
                    className="font-medium text-registration-red hover:text-registration-red/80"
                  >
                    로그인으로 돌아가기
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
