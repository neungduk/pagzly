# 26차 Cursor 구현 브리프 — 비밀번호 찾기/재설정 기능

## 배경

현재 `/login`, `/signup`에 이메일+비밀번호 로그인/가입은 있지만(Supabase Auth,
`@supabase/ssr`), 비밀번호를 잊어버린 사용자가 스스로 재설정할 방법이 없습니다.
로그인 페이지에 "비밀번호를 잊으셨나요?" 링크조차 없는 상태 — 실제로 비밀번호를
잊은 사용자가 자력으로 복구 가능하게 만드는 것이 이번 목표입니다.

## 현재 인증 구조 (참고)

- `lib/supabase.ts` — 브라우저 클라이언트 (`createBrowserClient`)
- `lib/supabase/server.ts` — 서버 컴포넌트/라우트용 클라이언트
- `lib/supabase/middleware.ts` — `updateSession()`, `/onboarding`·`/create` 경로만
  로그인/온보딩 여부로 리다이렉트. 새 라우트(`/forgot-password`, `/reset-password`)는
  이 로직에 걸리지 않으므로 미들웨어 수정 불필요.
- `app/auth/callback/route.ts` — OAuth/이메일 링크의 `code`를
  `exchangeCodeForSession()`으로 교환 후 `next` 쿼리 파라미터로 리다이렉트. 현재는
  성공 시 무조건 온보딩 완료 여부를 체크해서 `/onboarding` 또는 `next`로 보냄 —
  비밀번호 재설정 흐름에서는 이 온보딩 체크를 건너뛰어야 함(아래 3번 참고).
- `app/login/page.tsx`, `app/signup/page.tsx` — 카카오/구글 OAuth 버튼 + 이메일/비밀번호
  폼, 스타일 패턴(rounded-2xl 카드, `registration-red` 액센트) 재사용.

## 구현할 흐름

1. `/login`에서 "비밀번호를 잊으셨나요?" 클릭 → `/forgot-password`
2. 이메일 입력 → `supabase.auth.resetPasswordForEmail(email, { redirectTo:
   \`${origin}/auth/callback?next=/reset-password\` })` 호출 → 성공 메시지 표시
   (이메일 존재 여부와 무관하게 항상 동일한 성공 메시지 — 계정 존재 여부 노출 방지)
3. 사용자가 이메일의 링크 클릭 → `/auth/callback?code=...&next=/reset-password` →
   기존 `exchangeCodeForSession()`으로 세션 생성 → **온보딩 체크 건너뛰고** `/reset-password`로
   리다이렉트
4. `/reset-password`에서 새 비밀번호 입력(+확인) → `supabase.auth.updateUser({ password })`
   → 성공 시 `supabase.auth.signOut()` 후 `/login?reset=success`로 리다이렉트
5. `/login`이 `?reset=success` 쿼리를 보고 "비밀번호가 변경되었습니다. 새 비밀번호로
   로그인해 주세요." 안내 배너 표시

## 수정 지시사항

### 1) `app/login/page.tsx` — 링크 추가 + 성공 배너

비밀번호 입력 필드(105-121행) 바로 아래, `{error && ...}` 블록(123-127행) 위에 링크 추가:

```tsx
<div className="text-right">
  <Link
    href="/forgot-password"
    className="text-xs font-medium text-ink/50 hover:text-registration-red"
  >
    비밀번호를 잊으셨나요?
  </Link>
</div>
```

컴포넌트 상단에 쿼리 파라미터 읽기 추가(`useSearchParams` from `next/navigation`)해서
`?reset=success`일 때 성공 배너를 `{error && ...}` 블록과 같은 자리에 렌더링:

```tsx
import { useSearchParams } from "next/navigation";
// ...
const searchParams = useSearchParams();
const resetSuccess = searchParams.get("reset") === "success";
```

```tsx
{resetSuccess && !error && (
  <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
    비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
  </p>
)}
```

`useSearchParams()`를 쓰는 클라이언트 컴포넌트는 Next.js에서 `<Suspense>` 경계가
필요합니다 — `LoginPage`를 `LoginForm`으로 이름 바꾸고, 새 `export default function
LoginPage()`가 `<Suspense fallback={null}><LoginForm /></Suspense>`로 감싸는 형태로
바꿔주세요(다른 페이지에 이미 이 패턴이 있으면 그대로 따르고, 없으면 이 파일 안에서
새로 구성).

### 2) 신규 파일: `app/forgot-password/page.tsx`

`app/login/page.tsx`와 동일한 레이아웃 셸(로고 헤더 + `rounded-2xl` 카드)을 그대로
재사용하고, 폼만 이메일 하나로 교체:

```tsx
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
```

### 3) `app/auth/callback/route.ts` — 비밀번호 재설정 흐름은 온보딩 체크 건너뛰기

```ts
// 기존
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const userId = data.user?.id;
      if (userId && !(await hasCompletedOnboarding(supabase, userId))) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

```ts
// 수정
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
```

### 4) 신규 파일: `app/reset-password/page.tsx`

콜백에서 세션이 이미 생성된 상태로 도착합니다. 세션이 없으면(직접 URL 접근 등)
안내 후 `/forgot-password`로 유도합니다.

```tsx
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
```

## Supabase 대시보드 설정 (사용자 확인 필요 — 코드 밖 작업)

이 부분은 이 세션도 Cursor도 코드로 처리할 수 없습니다. 사용자가 Supabase
프로젝트 대시보드에서 직접 확인해야 합니다:

1. **Authentication → URL Configuration → Redirect URLs**에
   `https://<프로덕션도메인>/auth/callback`과 로컬 개발용
   `http://localhost:3000/auth/callback`이 등록돼 있는지 확인 — 없으면
   `exchangeCodeForSession()`이 실패합니다.
2. **Authentication → Email Templates → Reset Password** 템플릿이 활성화돼 있는지
   확인(기본으로 켜져 있지만 커스텀 SMTP를 안 쓰면 Supabase 기본 발신 한도가
   낮을 수 있음 — 실사용 트래픽이 늘면 커스텀 SMTP 연결 고려).

## 검증 시 확인할 것

1. `/login`에 "비밀번호를 잊으셨나요?" 링크가 보이는지
2. `/forgot-password`에서 실제 존재하는 테스트 계정 이메일로 요청 → 메일함에
   재설정 링크 도착 확인 (실제 이메일 발송이 필요하므로 테스트 계정 이메일을
   실제로 확인할 수 있어야 함)
3. 링크 클릭 → `/reset-password`로 정상 도착, 새 비밀번호 입력 → 변경 성공 →
   `/login?reset=success`로 리다이렉트, 성공 배너 노출 확인
4. 새 비밀번호로 실제 로그인 성공 확인
5. `/reset-password`에 세션 없이(다른 브라우저·시크릿창 등) 직접 접근 시 "링크가
   만료되었습니다" 화면이 뜨는지 확인
6. `tsc --noEmit`로 신규 에러 없는지 확인 — 특히 `useSearchParams` Suspense 경계
   처리 여부(Next.js 빌드 시 에러로 잡힘)
