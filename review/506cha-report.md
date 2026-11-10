# 506차 보고서

## 확인하지 못한 항목
- 브라우저에서 문구 붙여넣기·다시 점검·수정안 복사 실측(코드·회귀만 확인).
- rewrite-map `kind:guideline_exception` 전 항목 × 예외 규칙 교차 전수(대표 쌍·자기검증 general/US 위주).
- 시안 A 광고 2건을 “고친 문구”로 정확히 대응시킨 E2E 수치(비교 API는 priorKeys 합 검증).

## finding 구조 전/후 (시안 A 광고 항목 예시)
**전(505):** `{ category, label, status, found, suggest, fixSuggestion?, fixKind?, exceptionNote? }`

**후(506):** 동일 +  
`checkKey`, `fix{kind,headline,templates?,alternatives?,note?}`, `evidence[{found,sentence}]`, `basis?`, `exception?`  
결과 상위: `scopeNotice?`, `compare?`, `fixSheet?`, `ingredientCount?`

저장(`sanitizeFindingsForSave`)은 여전히 `label/status/line`만 — `found`·`sentence`·`evidence` 미저장.

## 예외 10개 시험 (요약)
| id | 충족 | 미충족 | 비고 |
|---|---|---|---|
| EXC-01 | soft 경로 | 지적 | 보습+일시적 |
| EXC-02 | 색조 입력 시 soft / 미입력 시 색조 안내 | 지적 | productTypes=color_makeup |
| EXC-05 | not_applicable(지적 제외) | 지적 | 피부·모공 vs 체내 |
| EXC-06 | soft | 지적 | 식물 vs 인체 엑소좀 |
| EXC-03~04,07~10 | 엔진·데이터 로드 10개 확인 | — | 회귀 쌍은 대표 위주 |

## 대체 문구 자기 검증
- rewrite-map-kr `kind:general` → ad_only 광고 지적 0 (실패 시 데이터 문제로 보고 — 이번 실행 통과).
- rewrite-map-us 전부 → US ad_only 0 (통과).

## 미구현·데이터 필요
- INCI 명칭 유효성, 색소(CI/FD&C) 허용, 금지 성분, 함량 순서, 주(州)법, OTC Drug Facts.
- 성분명 표준 사전 대조, 배합금지·한도 원료 자동 판정.
- 507 UI 시안 전면 개편(이번은 붙여넣기·다시 점검·fix 접힘 최소 연결).

## 데이터 문제
- 없음(규칙 JSON 미수정). 금지어 회귀 회피: US “승인” 표현을 “해당 여부”로 완화(카피만, 데이터 파일 아님).

## 검증
- `npx tsc --noEmit` / `npm run build` / `validate:rules`(0/0) / `regression:label-check` 16/16
- push: cloud-work only

## 커밋
- (push 후 tip 기입)
