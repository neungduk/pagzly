# 44차 Cursor 브리프 — 랜딩페이지 요금제 UI를 실제 요금제로 교체

생성: 2026-08-31
근거: `claude/pagzly-pricing-cost-model-2026.md` §2, `lib/cost/saas-pricing-config.ts`(37차)
범위: `lib/landing-content.ts`의 `LANDING_PLANS` 데이터 교체 + `app/page.tsx`의 가격 카드 CTA 링크 연결. 레이아웃(CSS)은 그대로 유지합니다.

---

## 1. 문제

`lib/landing-content.ts`의 `LANDING_PLANS`가 지금 완전히 옛날 데이터입니다 — 크레딧 시스템이 생기기 전 "무제한 생성" 개념으로 만들어진 정적 텍스트라, 실제 요금제(37차 `saas-pricing-config.ts`)와 전혀 다른 가격·기능을 사용자에게 보여주고 있습니다:

| | 랜딩페이지(현재, 틀림) | 실제 요금제(맞음) |
|---|---|---|
| 무료 | ₩0, 월 3회 생성 | 가입 시 5크레딧 1회 지급(정기 플랜 아님) |
| 스타터 | ₩19,900, 월 30회 생성 | ₩29,000, 월 10크레딧 |
| 그로스 | ₩49,000, 무제한 생성 | ₩79,000, 월 30크레딧 |
| (없음) | — | 프로 ₩149,000, 월 55크레딧 |

이 파일 상단 주석에 적혀 있듯 `lib/landing-content.ts`는 **랜딩페이지와 AI 상담봇(`support-chat`)이 공유**하는 데이터라, 이 파일 하나만 고치면 상담봇의 가격 답변도 같이 정확해집니다.

## 2. 변경 사항

### 2-1. `lib/landing-content.ts` — `LANDING_PLANS` 전체 교체

```ts
export const LANDING_PLANS: LandingPlan[] = [
  {
    name: "스타터",
    price: "29,000",
    period: "월",
    description: "처음 시작하는 셀러를 위한 플랜",
    features: [
      "월 10크레딧 (상세페이지 10건)",
      "AI 자동 카피·레이아웃·색감 완성",
      "고해상도 이미지 즉시 다운로드",
      "직접 편집 가능",
    ],
    highlighted: false,
    cta: "스타터 시작하기",
  },
  {
    name: "그로스",
    price: "79,000",
    period: "월",
    description: "매출이 늘고 있는 셀러를 위한 플랜",
    features: [
      "월 30크레딧 (상세페이지 30건)",
      "AI 자동 카피·레이아웃·색감 완성",
      "고해상도 이미지 즉시 다운로드",
      "직접 편집 가능",
    ],
    highlighted: true,
    cta: "그로스 시작하기",
  },
  {
    name: "프로",
    price: "149,000",
    period: "월",
    description: "다품목을 운영하는 셀러를 위한 플랜",
    features: [
      "월 55크레딧 (상세페이지 55건)",
      "AI 자동 카피·레이아웃·색감 완성",
      "고해상도 이미지 즉시 다운로드",
      "직접 편집 가능",
    ],
    highlighted: false,
    cta: "프로 시작하기",
  },
];
```

기존엔 "무료" 플랜이 4번째 카드로 있었는데 뺐습니다 — 지금 무료 크레딧은 상시 이용 가능한 "플랜"이 아니라 가입할 때 한 번 주는 5크레딧이라, 구독 플랜 카드와 나란히 두면 오해를 줍니다. 대신 아래 2-3에서 그리드 밑에 짧은 안내 문구로 처리합니다. (`highlighted: true`는 그로스로 옮겼습니다 — 하이브리드 요금제에서 중간 티어를 "추천"으로 미는 게 일반적인 선택이라 그렇게 했는데, 마케팅 판단이 다르면 이 필드만 바꾸면 됩니다.)

### 2-2. `app/page.tsx` — 가격 카드 CTA 링크 연결 (346~355행)

지금 `<a href="#">`로 아무 데도 안 가는 죽은 링크입니다. `/billing/subscribe`로 연결합니다 (이 페이지는 39차에서 이미 비로그인 사용자를 `/login`으로 돌려보내는 가드가 있어서, 랜딩페이지 쪽에서 로그인 여부를 따로 체크할 필요 없습니다):

```tsx
// 변경 전
<a
  href="#"
  className={...}
>
  {plan.cta}
</a>

// 변경 후
<Link
  href="/billing/subscribe"
  className={...}
>
  {plan.cta}
</Link>
```

(`Link`는 파일 상단에 이미 `import Link from "next/link";`로 들어와 있으니 추가 import 불필요합니다.)

### 2-3. `app/page.tsx` — 가격 그리드 아래 무료 크레딧·팩 안내 문구 추가 (358행 `</RevealOnScroll>` 직후, 360행 `</section>` 앞)

```tsx
<p className="mt-10 text-center text-sm text-ink/50">
  가입하면 무료 크레딧 5개를 드립니다.{" "}
  <Link href="/billing/packs" className="underline underline-offset-2 hover:text-ink">
    구독 없이 크레딧만 추가 구매
  </Link>
  하는 것도 가능해요 (5개 ₩16,900 · 15개 ₩44,900).
</p>
```

## 3. 하드 룰

1. CSS/레이아웃(그리드 열 수, 카드 스타일)은 손대지 않습니다 — 카드가 4개에서 3개로 줄어도 기존 `lg:grid-cols-3`이 오히려 정확히 맞아떨어지므로 그대로 둡니다.
2. `LandingPlan` 타입(`lib/landing-content.ts` 14~22행)은 변경하지 않습니다 — 기존 필드 구조 그대로 값만 교체합니다.
3. `support-chat` 라우트가 `LANDING_PLANS`를 가져다 쓰는 부분이 있다면(있는지 확인해 주세요) 별도 수정 없이 이 데이터 교체만으로 자동 반영되어야 합니다 — 혹시 `support-chat/route.ts`에 가격이 하드코딩된 별도 텍스트가 있다면 그것도 같이 알려주세요(이번 브리프 범위에 없던 게 발견되면 42~44차와 별개로 다음 라운드에서 처리하겠습니다).

## 4. 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 랜딩페이지 `/`의 요금제 섹션에 스타터 ₩29,000 / 그로스 ₩79,000(추천 배지) / 프로 ₩149,000 3장만 보이는지 확인
- [ ] 각 카드의 "OO 시작하기" 버튼 클릭 → `/billing/subscribe`로 이동하는지 확인
- [ ] 그리드 아래 "가입하면 무료 크레딧 5개..." 문구와 "구독 없이 크레딧만 추가 구매" 링크가 `/billing/packs`로 연결되는지 확인
- [ ] 상담봇(`support-chat`)에 가격을 물어봤을 때 새 요금제(29,000/79,000/149,000)로 답하는지 간단히 확인

## 5. 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, 위 체크리스트 결과, `support-chat`에서 가격 하드코딩이 별도로 발견됐는지 여부를 포함해 주세요.
