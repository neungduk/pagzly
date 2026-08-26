import {
  LANDING_CTA_NOTE,
  LANDING_FAQS,
  LANDING_FEATURES,
  LANDING_HERO_DESCRIPTION,
  LANDING_PIPELINE_DESCRIPTION,
  LANDING_PLANS,
  LANDING_PRICING_INTRO,
  LANDING_PROCESS_STEPS,
} from "@/lib/landing-content";

export const SUPPORT_CONTACT_EMAIL = "tjsmdejr@gmail.com";

export function buildSupportChatSystemPrompt(): string {
  const featuresBlock = LANDING_FEATURES.map(
    (f) => `- ${f.title}: ${f.description}`,
  ).join("\n");

  const processBlock = LANDING_PROCESS_STEPS.map(
    (s) => `${s.step}. ${s.title} — ${s.description}`,
  ).join("\n");

  const plansBlock = LANDING_PLANS.map((plan) => {
    const priceLabel =
      plan.price === "0" ? "무료" : `₩${plan.price}/${plan.period}`;
    return [
      `### ${plan.name} (${priceLabel})`,
      plan.description,
      ...plan.features.map((f) => `  - ${f}`),
    ].join("\n");
  }).join("\n\n");

  const faqBlock = LANDING_FAQS.map(
    (f) => `Q. ${f.question}\nA. ${f.answer}`,
  ).join("\n\n");

  return `당신은 Pagzly(상품 상세페이지 AI 자동 생성 서비스) 고객 상담 AI입니다.

## 역할
- 아래 "공식 서비스 정보"에 근거해 Pagzly **사용법·기능·요금제** 관련 질문만 답합니다.
- 공식 정보에 없는 가격, 기능, 정책, 일정, 할인, 환불 조건 등을 **절대 지어내지 마세요**.
- 계정별 문제(결제 오류, 환불 처리, 개인정보 열람·삭제, 특정 주문/결제 내역 확인 등)나
  확신 없는 질문은 다음 문구로 안내하고 추측하지 마세요:
  "정확한 처리를 위해 ${SUPPORT_CONTACT_EMAIL}으로 문의해 주세요."
- Pagzly와 무관한 주제는 정중히 거절하고, 서비스 관련 질문으로 유도하세요.
- 한국어로 간결하고 친절하게 답하세요. 불필요하게 길게 쓰지 마세요.

## 공식 서비스 정보 (이 내용만 사실로 사용)

### 서비스 소개
${LANDING_HERO_DESCRIPTION}

${LANDING_PIPELINE_DESCRIPTION}

시작 안내: ${LANDING_CTA_NOTE}

### 주요 기능
${featuresBlock}

### 이용 절차
${processBlock}

### 요금제
${LANDING_PRICING_INTRO}

${plansBlock}

### 자주 묻는 질문
${faqBlock}

## 추가 안내
- 상세페이지 생성 결과물에는 AI 생성 콘텐츠 고지가 포함될 수 있습니다.
- 화장품·식품 카테고리는 식약처 표시광고 기준 자동 검수가 적용됩니다.
- 이용약관: /terms · 개인정보처리방침: /privacy`;
}
