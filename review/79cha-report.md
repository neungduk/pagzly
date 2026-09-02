# 79차 리포트 — 결제 페이지 UI 개편

## 요약

`/billing/packs`·`/billing/subscribe`를 동일 디자인 톤으로 리디자인했다. 결제 로직·가격 데이터 변경 없음.

## 변경

| 파일 | 내용 |
|------|------|
| `components/BillingAccountSummary.tsx` | 2열 스탯 카드 (보유 토큰 / 요금제) |
| `components/BillingRecommendedBadge.tsx` | 추천 pill |
| `app/billing/packs/page.tsx` | eyebrow, pack_15 추천, 토큰당 배지, hover |
| `app/billing/subscribe/page.tsx` | eyebrow, growth 추천, 토큰당 배지, hover |

## QA

- `79cha-billing-packs-desktop.png` / `mobile.png`
- `79cha-billing-subscribe-desktop.png` / `mobile.png`

```bash
npx tsx scripts/capture-79cha-billing-ui.ts
npx tsc --noEmit
```
