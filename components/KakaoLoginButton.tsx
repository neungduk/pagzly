"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

type KakaoLoginButtonProps = {
  label: string;
  onError?: (message: string) => void;
};

function KakaoIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3C6.477 3 2 6.463 2 10.714c0 2.793 1.858 5.242 4.658 6.634l-.965 3.577a.5.5 0 0 0 .748.548l4.155-2.768C11.308 18.556 11.651 18.571 12 18.571c5.523 0 10-3.463 10-7.857C22 6.463 17.523 3 12 3z" />
    </svg>
  );
}

export default function KakaoLoginButton({
  label,
  onError,
}: KakaoLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleKakaoLogin() {
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      onError?.(error.message);
    }
  }

  return (
    <button
      type="button"
      onClick={handleKakaoLogin}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#191919] transition-colors hover:bg-[#F5DC00] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <KakaoIcon />
      {loading ? "연결 중..." : label}
    </button>
  );
}
