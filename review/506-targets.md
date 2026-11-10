# 506차 목표·설계 (코드 전)

## 성공 기준
1. Finding에 `fix` / `evidence` / `basis` / `exception` 선택 필드. 매핑: rewrite-map(KR/US)·required-templates·없으면 `kind:manual`+기존 fix_ko. 저장 시 evidence.sentence·found 원문 미저장.
2. KR 광고: 문장 단위 ad-exceptions 10개. not_applicable 제외 / exception_possible 낮춤+안내 / evidence·needs_disclaimer → fix.kind. 확정 문구 금지.
3. 텍스트 모드 API: ExtractedLabelPayload 1쪽, scope `ad_only`(기본)|`full`, 20k자, 빈입력/초과 코드. ad_only는 필수·pt·주의 누락 미실행+안내.
4. 재점검: 클라 prior id 목록 → `compare.{resolved,remaining,added}`. UI 카피 허용 문구만.
5. `buildFixSheet(result)` 클립보드 텍스트(고칠 것→확인할 것, alt≤2, 면책).
6. US Ingredients 파싱·확인 필요 수준 판정(데이터 범위). KR 전성분 파싱·향료/주의/기타/영문만 안내(데이터 범위).
7. `label-check-506` 등록. tsc/build/validate/regression:label-check. 커밋≤6. main 미푸시. 규칙 JSON 미수정. 하드코딩 대체문구 금지.

## 설계 요약
- 로더: `rewrite-map-*`, `ad-exceptions-kr`, `required-templates` (읽기 전용).
- 광고 스캔 후 예외 엔진 → enrichFindings506(rewrite/templates/basis/evidence 문장).
- `runLabelCheckFromExtracted`에 `scope`/`comparePrior` 옵션. 텍스트→최소 ExtractedPdf.
- 저장 sanitize: findings에서 sentence/found 제거(기존 495 유지·확장).
- UI: 텍스트 붙여넣기·다시 점검·fixSheet 복사(최소, 507 전 동작 확인용).

## 비목표
- 507 UI 개편, Production/main, 유료 호출, INCI/금지성분/함량순서/주법/OTC, 규칙 데이터 수정.
