# 503차 보고서

## 확인하지 못한 항목
- 전체 `npm run regression` 재실행(표시사항 전용·heavy-guard만 확인).
- 상세페이지 신규 깨짐 3건(폰트·v4 off·463) 원인 커밋 특정·수정(지시: 미수정).

## A·B 변경 요약
- `label-check-492/493`에서 playwright 제거. PDF는 `review/data/samples/regression-503/**`(및 기존 mutation/independent)만 읽음.
- 생성 로직: `scripts/label-check-make-fixtures-492.ts`(+ `assertHeavyEntry`). mutation 하네스에도 가드 적용.
- 픽스처 12개, 총 **323323 bytes** (~316KB).

| 파일 | bytes |
|---|---:|
| font-4_9.pdf | 27312 |
| font-5.pdf | 27305 |
| layout-twocol.pdf | 27287 |
| base.pdf | 27272 |
| inject-forbidden.pdf | 26962 |
| ad-whitening.pdf | 26510 |
| ad-wrinkle.pdf | 26707 |
| ad-hospital.pdf | 26454 |
| ad-stem.pdf | 27227 |
| ad-age.pdf | 26760 |
| ad-super.pdf | 26757 |
| ad-pct.pdf | 26770 |

## C. 무거운 도구 가드 — 우리 추가 실패 전/후

| 실패 문구 | 전(502) | 후(503) |
|---|---|---|
| `scripts/regression/label-check-492.ts: 회귀가 playwright를 직접 가져옴` | 있음 | **없음** |
| `scripts/regression/label-check-493.ts: 회귀가 playwright를 직접 가져옴` | 있음 | **없음** |
| `scripts/label-check-mutation-492.ts: 가드 없음` | 있음 | **없음** |
| 기타(이전부터의 `_47x-capture` 등) | 다수 | 그대로(허용) |

## `regression:label-check`
- **13/13 통과**, 총 **2722ms**.

## 기술 부채 (상세 신규 깨짐 — 이번 미수정)
1. 폰트 정책(Noto…) — 502 기준 OK→현재 NG
2. v4 off 동일(export) — 502 기준 OK→현재 NG
3. 단조로움 탈피 463 — 502 기준 OK→현재 NG  
(상세페이지 숨김 상태. 별도 지시 전까지 미착수. 분류: `review/502cha-report.md`)

## 검증
- `npx tsc --noEmit` OK · `npm run build` OK · `npm run regression:label-check` OK
- push: `cloud-work` only (main 미푸시)

## 커밋
- (push 직전)
