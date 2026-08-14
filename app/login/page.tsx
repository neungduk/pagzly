"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import KakaoLoginButton from "@/components/KakaoLoginButton";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/");
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
            <h1 className="text-2xl font-bold text-ink">로그인</h1>
            <p className="mt-2 text-sm text-ink/60">
              Pagzly 계정으로 로그인하세요
            </p>

            <div className="mt-8 space-y-5">
              <KakaoLoginButton
                label="카카오로 로그인"
                onError={setError}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-3 text-gray-400">또는</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
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

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-ink/80"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-ink/60">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="font-medium text-registration-red hover:text-registration-red/80"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
