import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { isDetailPageEnabled } from "@/lib/feature-flags";

function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;

  // 520 — 토스 CORS OPTIONS: Supabase 세션 갱신 생략
  if (
    request.method === "OPTIONS" &&
    (path === "/api/label-check" ||
      path === "/api/label-check/ocr" ||
      path === "/api/law-watch/baseline")
  ) {
    return NextResponse.next({ request });
  }

  // /dev/* 는 로컬 시각 검증용 — 프로덕션에서는 404
  if (process.env.NODE_ENV === "production" && path.startsWith("/dev")) {
    return new NextResponse(null, { status: 404 });
  }

  // 489 — 상세페이지 기능 꺼짐: /create·/onboarding 직접 접근 → 검수
  if (
    !isDetailPageEnabled() &&
    (path.startsWith("/create") || path.startsWith("/onboarding"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/label-check";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (path.startsWith("/onboarding")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return redirectWithCookies(url, supabaseResponse);
    }
    if (await hasCompletedOnboarding(supabase, user.id)) {
      const url = request.nextUrl.clone();
      url.pathname = "/create";
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  if (path.startsWith("/create")) {
    if (user && !(await hasCompletedOnboarding(supabase, user.id))) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  // 495 — 회원 검수 신청·내 결과
  if (path.startsWith("/label-check/new") || path.startsWith("/label-check/history")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path + (request.nextUrl.search || ""));
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  return supabaseResponse;
}
