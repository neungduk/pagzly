import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import PagzlyLogo from "@/components/PagzlyLogo";
import ShowcaseSection from "@/components/ShowcaseSection";
import ComparisonTable from "@/components/ComparisonTable";
import FaqAccordion from "@/components/FaqAccordion";
import CropMarks from "@/components/CropMarks";
import PipelineCard from "@/components/PipelineCard";
import CategoryColorEngine from "@/components/CategoryColorEngine";
import RevealOnScroll from "@/components/RevealOnScroll";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    title: "AI 자동 생성",
    description:
      "상품 사진만 업로드하면 AI가 카피, 레이아웃, 디자인까지 자동으로 완성합니다.",
    iconBg: "bg-mustard/15 text-mustard border-mustard/30",
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
    iconBg: "bg-slate-blue/10 text-slate-blue border-slate-blue/25",
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
    iconBg: "bg-registration-red/10 text-registration-red border-registration-red/25",
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

const processSteps = [
  {
    step: "01",
    title: "업로드",
    description: "상품 사진을 최대 5장까지 올려주세요. 스마트폰으로 찍은 사진이면 충분합니다.",
  },
  {
    step: "02",
    title: "색·카피 자동 분석",
    description:
      "AI가 사진에서 색상을 추출하고, 카테고리에 맞는 카피와 레이아웃을 자동으로 구성합니다.",
  },
  {
    step: "03",
    title: "완성",
    description: "2~3분 안에 상세페이지가 완성됩니다. 바로 다운로드하거나 정보를 수정해 다시 생성하세요.",
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

  const startHref = user ? "/create" : "/signup";

  return (
    <div className="min-h-full bg-paper text-ink">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <PagzlyLogo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/create"
                  className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
                >
                  상세페이지 만들기
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden px-4 py-2 text-sm font-medium text-ink/60 transition-colors hover:text-ink sm:inline-block"
                >
                  로그인
                </Link>
                <Link
                  href={startHref}
                  className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
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
        <section className="relative overflow-hidden border-b border-line bg-paper">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 border border-line px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-ink/50">
                <span className="h-1.5 w-1.5 rounded-full bg-registration-red" />
                AI 상세페이지 자동 생성
              </div>
              <h1 className="font-heading text-5xl font-bold leading-[1.1] tracking-tight text-ink sm:text-6xl">
                상세페이지가 늦어질수록,
                <br />
                <span className="text-registration-red">놓치는 주문</span>이
                늘어납니다
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/60">
                Pagzly는 상품 사진 한 장으로 색감·카피·레이아웃을 자동
                완성합니다. 디자이너를 구하고, 시안을 주고받고, 수정을
                기다리는 동안 오늘의 매출은 다시 오지 않습니다.
              </p>
              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link
                  href={startHref}
                  className="inline-flex h-12 w-full items-center justify-center bg-ink px-8 text-base font-semibold text-paper transition-transform transition-colors duration-200 hover:bg-ink/85 active:scale-[0.98] sm:w-auto"
                >
                  무료로 시작하기
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-12 w-full items-center justify-center border border-ink px-8 text-base font-semibold text-ink transition-transform transition-colors duration-200 hover:bg-ink hover:text-paper active:scale-[0.98] sm:w-auto"
                >
                  기능 살펴보기
                </a>
              </div>
              <p className="mt-4 font-mono text-xs text-ink/40">
                신용카드 없이 시작 · 언제든 해지 가능
              </p>
            </div>

            <div className="mx-auto w-full max-w-xs sm:max-w-sm lg:mx-0 lg:ml-auto">
              <PipelineCard />
            </div>
          </div>
        </section>

        <CategoryColorEngine />

        {/* Comparison */}
        <section id="comparison" className="border-b border-line bg-white py-24">
          <RevealOnScroll className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-registration-red">
                Comparison
              </p>
              <h2 className="mt-2.5 font-heading text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
                외주도, 템플릿 툴도 아닌 이유
              </h2>
              <p className="mx-auto mt-2.5 max-w-2xl text-sm text-ink/50">
                같은 상세페이지를 만드는 세 가지 방법을 나란히 놓고 비교했습니다.
              </p>
            </div>
            <div className="mt-16">
              <ComparisonTable />
            </div>
          </RevealOnScroll>
        </section>

        {/* Process */}
        <section className="border-b border-line bg-paper py-24">
          <RevealOnScroll className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
                Process
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                3단계면 충분합니다
              </h2>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {processSteps.map((item) => (
                <div
                  key={item.step}
                  className="relative border border-line bg-white p-8 transition-transform duration-300 hover:-translate-y-1"
                >
                  <CropMarks />
                  <span className="font-mono text-sm font-semibold text-registration-red">
                    STEP {item.step}
                  </span>
                  <h3 className="mt-4 font-heading text-xl font-bold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-ink/60">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-line bg-[#EEF2F1] py-24">
          <RevealOnScroll className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
                Features
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                왜 Pagzly인가요?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-ink/60">
                상세페이지 제작에 드는 시간과 비용을 획기적으로 줄여 드립니다.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative border border-line bg-white p-8 transition-transform duration-300 hover:-translate-y-1 hover:border-ink/30"
                >
                  <CropMarks />
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center border transition-colors ${feature.iconBg}`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-ink/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-line bg-white py-24">
          <RevealOnScroll className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
                FAQ
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                자주 묻는 질문
              </h2>
            </div>
            <div className="mt-16">
              <FaqAccordion />
            </div>
          </RevealOnScroll>
        </section>

        <ShowcaseSection />

        {/* Pricing */}
        <section id="pricing" className="border-b border-line bg-paper py-24">
          <RevealOnScroll className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">
                Pricing
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                합리적인 요금제
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-ink/60">
                규모에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.
              </p>
            </div>
            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col bg-white p-8 transition-transform duration-300 hover:-translate-y-1 ${
                    plan.highlighted
                      ? "border-2 border-registration-red"
                      : "border border-line"
                  }`}
                >
                  <CropMarks color={plan.highlighted ? "text-registration-red/50" : "text-line"} />
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-registration-red px-4 py-1 font-mono text-xs font-semibold text-paper">
                        추천
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-ink/60">{plan.description}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      {plan.price === "0" ? (
                        <span className="font-mono text-4xl font-bold tracking-tight text-ink">
                          무료
                        </span>
                      ) : (
                        <>
                          <span className="font-mono text-4xl font-bold tracking-tight text-ink">
                            ₩{plan.price}
                          </span>
                          <span className="text-sm text-ink/50">/ {plan.period}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-ink/70">
                        <svg
                          className="mt-0.5 h-5 w-5 shrink-0 text-registration-red"
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
                    className={`mt-8 inline-flex h-11 items-center justify-center text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? "bg-ink text-paper hover:bg-ink/85"
                        : "border border-line text-ink hover:border-ink"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </section>

        {/* CTA */}
        <section className="bg-ink py-20">
          <RevealOnScroll className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-paper sm:text-4xl">
              지금 바로 시작해 보세요
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-paper/60">
              상품 사진 하나만 있으면 2~3분 안에 팔리는 상세페이지가 완성됩니다.
            </p>
            <Link
              href={startHref}
              className="mt-8 inline-flex h-12 items-center justify-center bg-registration-red px-8 text-base font-semibold text-paper transition-transform transition-colors duration-200 hover:bg-registration-red/85 active:scale-[0.98]"
            >
              무료로 시작하기
            </Link>
          </RevealOnScroll>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-paper py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <PagzlyLogo className="h-7 w-auto" />
            <div className="flex gap-6 text-sm text-ink/50">
              <a href="#" className="transition-colors hover:text-ink">
                이용약관
              </a>
              <a href="#" className="transition-colors hover:text-ink">
                개인정보처리방침
              </a>
              <a href="#" className="transition-colors hover:text-ink">
                문의하기
              </a>
            </div>
          </div>
          <p className="mt-8 text-center font-mono text-xs text-ink/30 sm:text-left">
            © 2026 Pagzly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
