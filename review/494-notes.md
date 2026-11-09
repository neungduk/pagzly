# 494차 노트

## 한 글자 패턴 전수 점검
- `kr_label_rules_draft_v0.1.json` examples·ad-phrases patterns: JSON 내 한글 1글자는 없음(광고 `無`는 영·기호 경계 처리 유지).
- 로더 하드코드 allergen patterns `향료`/`착향제`/`향` 중 **`향`만 1글자**. 494에서 앞뒤 비한글 경계로 제한 → `향남읍` 미매칭, `향료`는 그대로 검출.

## 글자 크기 환산 (US Ingredients)
- 21 CFR 701.3: 성분 글자 높이 **1/16 inch** 이상(소형 포장 예외는 데이터 note).
- 환산: 1 inch = 72 pt → 1/16 inch = **4.5 pt**. PDF 폰트 크기 추출 가능할 때만 attention, 불가 시 unknown.
- 701.13 하단 영역 세부·1/32 inch 예외는 원문 미대조(데이터 not_verified).

## 수정 제안
- 미국: 규칙 JSON `fix_ko` / `fix_example_en` → finding.fixSuggestion / fixExample.
- 한국: 필드 없음 → `review/data/fix-suggestions-kr_todo.md` 목록만. 광고는 fixKind soften/evidence + 근거 한 줄만.
- PDF 자동 수정 없음. 화면 "완벽 검수/자동 수정 보장" 미사용.

## 어댑터
- KR: `load-rules.ts` + `run-check.ts` + `ad-phrases.ts`
- US: `load-rules-us.ts` + `run-check-us.ts` + `normalize-us.ts`
- 진입: `runLabelCheck483`이 `input.market==="US"`면 US 러너로 분기.
