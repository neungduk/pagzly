import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCompletedOnboarding } from "@/lib/onboarding";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 비밀번호 재설정 흐름은 온보딩 여부와 무관하게 항상 재설정 페이지로 보낸다.
      if (next === "/reset-password") {
        return NextResponse.redirect(`${origin}${next}`);
      }
      const userId = data.user?.id;
      if (userId && !(await hasCompletedOnboarding(supabase, userId))) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
