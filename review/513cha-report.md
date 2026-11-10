# 513차 보고서 — "직접 확인" 항목 대폭 줄이기

## 확인하지 못한 항목
- 실제 브라우저에서 접이식·「판매자가 꼭 확인할 것」 육안 확인
- 기능성화장품 「바로 아래」 위치(좌표 없음) — 크기만 코드, 위치는 판매자 확인으로 남김
- 표준 국문 성분명 사전 대조(사전 데이터 없음) — 영문 전용 토큰 힌트만
- 파일럿 샘플의 **이전** 직접 확인 건수는 512 시점 동작 기준 추정(항상 수동 카드 다수). 정확한 구 스냅샷 재실행은 하지 않음

## 항목별 처리 결과

### 한국 (2-2)
| 항목 | 결과 |
|------|------|
| 수출 전용 제품 | 옵션 `export_only`로 대체. 체크 시 한국 finding 축소 + 상단 안내. 미체크면 skipped |
| KR-PEND-001 개정안 | 참고 접이식으로 이동(판정 제외) |
| 세트 제조번호·사용기한 / 세트 표시 | 텍스트·옵션 감지 → finding. 없으면 skipped |
| 색조 착색제 ± | 옵션·CI/호수 감지 → pass/고칠 것/unknown. 없으면 skipped |
| 제조번호·사용기한 구별 | 항상 코드 판정 |
| 중화·비누화 | 중화제·비누 단서 시에만 안내 finding |
| 기타 성분 | 「기타 성분」 문구 있을 때만 확인할 것 |
| 기능성 문구 위치·크기 | 크기 비교(가능 시). 위치는 판매자 확인 1건 |
| 표준 국문 성분명 | 영문 전용 토큰 → finding + 사전 없음을 이유로 판매자 확인 1건 |

### 미국 (2-3)
| 항목 | 결과 |
|------|------|
| US-001 제품명 | 최대 sizePt 줄을 후보로 확인할 것(크기 없으면 unknown) |
| US-007 영어 | Net·Ingredients·상호 영문 단서 있을 때만 pass |
| US-008 안전성 경고 | 문구 있으면 pass, 없으면 판매자 확인(근거 자료 모름) |
| US-009 위험 경고 | aerosol 등·옵션 시에만 점검 |
| US-011 전문가용 | professional 단서·옵션 시에만 점검 |
| US-012 향료 알레르기 | 참고 접이식으로 이동 |

## 샘플별 직접 확인 건수 (이전 → 이후)

이전: 규칙 `ai`/`manual` + 별표4 수동 4건을 **상황 무관** 전부 붙이던 구조(파일럿 기준 대략 7~9건대).

| 샘플 | 이전(추정) | 이후 `summary.manual` | 남는 판매자 확인 | 새로 나온 고칠 것/확인할 것(게이팅) |
|------|------------|----------------------|------------------|-------------------------------------|
| A moari toner | ~7+ | **1** | 표준 국문 성분명 사용 | 제조번호·사용기한 구별(attention) |
| B rovan sun | ~7+ | **2** | 기능성 문구 위치, 표준 국문 | 구별(attention), 기능성 크기(unknown) |
| C salt bodywash | ~7+ | **1** | 표준 국문 성분명 사용 | 구별(pass) |

## 사람이 봐야 해서 남긴 항목(고객 화면 문구)
- **표준 국문 성분명 사용** — 왜 직접 봐야 하나요: 표준 국문명 사전이 없어 정확성은 서비스가 판정하지 않아요
- **기능성화장품 문구 위치** (해당 시) — 왜 직접 봐야 하나요: 글자 위치(바로 아래 여부) 정보가 없어요
- **안전성 미입증 경고** (US, 문구 없을 때) — 왜 직접 봐야 하나요: 안전성 근거 자료는 서비스가 알 수 없어요

## 거짓 통과 방지 조건
- pass는 긍정 증거 문자열(`found`)이 있을 때만
- 착색제: CI/호수 + `±`/`+/-` 둘 다 있을 때만 pass
- 세트: 제조번호·사용기한 단서 둘 다 있을 때만 pass
- 기능성 크기: sizePt 비교 가능할 때만 pass/possible, OCR·무크기면 unknown
- US-007: Net·Ingredients·상호 영문 단서 모두 있을 때만 pass(「영문 흔적」만으로 pass 금지)
- US-008: 경고 문구 없으면 pass 금지 → 판매자 확인
- 해당 없음 → skipped(숨김), maybe만 manual

## 구현 위치
- 신규: `lib/label-check/gating-513.ts`, `lib/label-check/checks-513.ts`
- 연결: `run-check.ts`, `run-check-us.ts`(호출만)
- 옵션: `product-type-options-504.ts`에 export_only/set_product/soap/professional/hazardous
- addenda: KR-ADD-002/009/010/011 무조건 manual 제거(게이팅 대체)
- UI: `ResultView.tsx` 제목·whyManual·skipped/참고 접이식
- 회귀: `label-check-513-gating.ts` 등록. 기대값 갱신: `label-check-483.ts` A/B/C summary, `label-check-511-ui.ts` lib 허용 목록

## 검증
- `npx tsc --noEmit` 통과
- `npm run build` 통과
- `npm run regression:label-check` 25/25 통과

## 커밋 해시
```
3f137ee docs(513): cha-report for manual-item reduction
4a6c6ed test(513): gating suite and update A/B/C summary expectations
d537a06 feat(513): show seller-must-check list with skipped and reference notes
7e7e9a5 feat(513): wire KR/US run-check to gating and product-type options
d92b642 feat(513): add gating and code-check modules for applicable label rules
```
