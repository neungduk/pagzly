import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import PagzlyLogo from "@/components/PagzlyLogo";
import ShowcaseSection from "@/components/ShowcaseSection";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    title: "AI 자동 생성",
    description:
      "상품 사진만 업로드하면 AI가 카피, 레이아웃, 디자인까지 자동으로 완성합니다.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
        />
      </svg>
    ),
  },
  {
    title: "스마트스토어 원클릭 업로드",
    description:
      "완성된 상세페이지를 네이버 스마트스토어에 바로 업로드하세요. 복사·붙여넣기는 이제 그만.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    ),
  },
  {
    title: "직접 편집 가능",
    description:
      "AI가 만든 결과물을 그대로 쓰거나, 텍스트·이미지·섹션을 자유롭게 수정할 수 있습니다.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
        />
      </svg>
    ),
  },
];

const plans = [
  {
    name: "무료",
    price: "0",
    period: "월",
    description: "Pagzly를 처음 시작하는 분께",
    features: ["월 3회 생성", "기본 템플릿", "워터마크 포함"],
    highlighted: false,
    cta: "무료로 시작",
  },
  {
    name: "스타터",
    price: "19,900",
    period: "월",
    description: "소규모 셀러를 위한 플랜",
    features: ["월 30회 생성", "프리미엄 템플릿", "스마트스토어 업로드", "워터마크 제거"],
    highlighted: true,
    cta: "스타터 시작하기",
  },
  {
    name: "그로스",
    price: "49,000",
    period: "월",
    description: "성장하는 비즈니스를 위한 플랜",
    features: [
      "무제한 생성",
      "모든 템플릿",
      "스마트스토어 업로드",
      "우선 AI 처리",
      "팀 협업 (3명)",
    ],
    highlighted: false,
    cta: "그로스 시작하기",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-full bg-white text-gray-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <PagzlyLogo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/create"
                  className="rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5558e3]"
                >
                  상세페이지 만들기
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:inline-block"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5558e3]"
                >
                  무료 시작
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#6366f1]/5 to-white" />
          <div className="absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-[#6366f1]/10 blur-3xl" />
          <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366f1]/20 bg-[#6366f1]/5 px-4 py-1.5 text-sm font-medium text-[#6366f1]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6366f1] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6366f1]" />
              </span>
              AI 상세페이지 자동 생성
            </div>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              상품 사진 하나로
              <br />
              <span className="text-[#6366f1]">팔리는 상세페이지</span> 3분 완성
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500">
              Pagzly는 AI가 상품 이미지를 분석해 전환율 높은 상세페이지를 자동으로
              만들어 드립니다. 디자인 경험 없이도 전문가 수준의 결과물을 얻으세요.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#6366f1] px-8 text-base font-semibold text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:bg-[#5558e3] hover:shadow-xl hover:shadow-[#6366f1]/30 sm:w-auto"
              >
                무료로 시작하기
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-gray-200 px-8 text-base font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 sm:w-auto"
              >
                기능 살펴보기
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              신용카드 없이 시작 · 언제든 해지 가능
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-gray-50 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                왜 Pagzly인가요?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
                상세페이지 제작에 드는 시간과 비용을 획기적으로 줄여 드립니다.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-[#6366f1]/20 hover:shadow-md"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366f1]/10 text-[#6366f1] transition-colors group-hover:bg-[#6366f1] group-hover:text-white">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-gray-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ShowcaseSection />

        {/* Pricing */}
        <section id="pricing" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                합리적인 요금제
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
                규모에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.
              </p>
            </div>
            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.highlighted
                      ? "border-[#6366f1] bg-white shadow-xl shadow-[#6366f1]/10"
                      : "border-gray-200 bg-white shadow-sm"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-[#6366f1] px-4 py-1 text-xs font-semibold text-white">
                        인기
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      {plan.price === "0" ? (
                        <span className="text-4xl font-bold tracking-tight text-gray-900">
                          무료
                        </span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold tracking-tight text-gray-900">
                            ₩{plan.price}
                          </span>
                          <span className="text-sm text-gray-500">/ {plan.period}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                        <svg
                          className="mt-0.5 h-5 w-5 shrink-0 text-[#6366f1]"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#"
                    className={`mt-8 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? "bg-[#6366f1] text-white hover:bg-[#5558e3]"
                        : "border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#6366f1] py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              지금 바로 시작해 보세요
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-100">
              상품 사진 하나만 있으면 3분 안에 팔리는 상세페이지가 완성됩니다.
            </p>
            <a
              href="#"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-[#6366f1] transition-colors hover:bg-indigo-50"
            >
              무료로 시작하기
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <PagzlyLogo className="h-7 w-auto" />
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="transition-colors hover:text-gray-900">
                이용약관
              </a>
              <a href="#" className="transition-colors hover:text-gray-900">
                개인정보처리방침
              </a>
              <a href="#" className="transition-colors hover:text-gray-900">
                문의하기
              </a>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-gray-400 sm:text-left">
            © 2026 Pagzly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
