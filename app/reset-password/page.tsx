"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PagzlyLogo from "@/components/PagzlyLogo";
import { createClient } from "@/lib/supabase";

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
            {!hasSession ? (
              <>
                <h1 className="text-2xl font-bold text-ink">링크가 만료되었습니다</h1>
                <p className="mt-2 text-sm text-ink/60">
                  비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시
                  요청해 주세요.
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-6 block w-full rounded-lg bg-ink px-4 py-2.5 text-center text-sm font-semibold text-paper transition-colors hover:bg-ink/90"
                >
                  비밀번호 찾기로 돌아가기
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-ink">새 비밀번호 설정</h1>
                <p className="mt-2 text-sm text-ink/60">
                  새로 사용할 비밀번호를 입력해 주세요.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-ink/80"
                    >
                      새 비밀번호
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6자 이상"
                      className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm outline-none transition-colors focus:border-registration-red focus:ring-2 focus:ring-registration-red/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-ink/80"
                    >
                      새 비밀번호 확인
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="6자 이상"
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
                    {loading ? "변경 중..." : "비밀번호 변경"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
