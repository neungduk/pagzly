# 514차 보고서 — 랜딩 v3 디자인 교체

## 확인하지 못한 항목
- 실브라우저 360/390/768/1440 캡처·가로 스크롤 육안(폰/클라우드 규칙으로 CSS 정적 점검으로 대체)
- Pretendard woff2 subset 자체 호스팅(용량·라이선스 파일 미준비) → **Noto Sans KR(next/font) 유지**
- 시안의 "요금"·"무료로 점검"·"1분이면 끝납니다"는 정책/사실 미확정으로 제외

## 한 줄 안내 사실 확인
| 문구 | 판정 | 근거 |
|------|------|------|
| 로그인 없이 시작 | 채택 | `/label-check`는 비로그인 점검 가능(`/label-check/new`만 로그인 유도) |
| 점검 후 파일 저장 안 함 | 채택 | `save-run.ts`가 PDF·원문·파일명 저장 금지, 요약만 저장 |
| 한국 · 미국 기준 | 채택 | market KR/US 분기 존재 |
| 0 보관(원본) | 채택 | 위와 동일 |

## 구현 요약
- 토큰: 배경 `#F7F7F5`, 강조 파랑 `#1D4ED8`, CTA 검정 알약. 코랄/진초록 제거.
- 랜딩: sticky 상단 바 → 히어로 → 제품 화면(예시 라벨+판정 카드) → 숫자 띠 → 전/후 → 파란 마무리 → 푸터.
- 규칙 수: `labelRuleCounts514()`가 `review/data` JSON import로 실측(KR/US). 최초 fs 로더는 `/page` 클라 청크에 `node:fs`가 섞여 build 실패 → JSON import로 교체.
- 데모 데이터: `landing-demo-514.ts` 한곳. "예시 화면입니다" 표기.
- 점검 경로: `/label-check`(실제 시작 경로). `/label-check/check` 미사용.

## 글꼴
Pretendard subset을 `public/fonts`에 두지 않음(라이선스·용량 리스크). 기존 Noto Sans KR + IBM Plex Mono 유지(2종).

## 검증
- `npx tsc --noEmit` 통과
- `npm run build` 통과
- `npm run regression:label-check` 26/26 통과

## 커밋 해시
(push 직전 `git log --oneline` 값으로 갱신)
