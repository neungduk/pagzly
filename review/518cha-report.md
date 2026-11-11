# 518차 보고서 — 읽기 품질·OCR 확인·결과 본문·하드클레임

## 확인하지 못한 항목
- 실제 FireShot PDF(595×5678pt)·CLOVA/Vision 네트워크 OCR 호출은 하지 않음(목업·스케일 계산만).
- 브라우저에서 OcrReview517·FindingBody518 시각 확인 미실시(정적·회귀만).
- 회전(세로) 글자 읽기 순서는 범위 밖(지시서).
- `npm run build` 전체는 시간상 생략 가능 — `npx tsc --noEmit`·`npm run regression:label-check`로 검증.

## 커밋 (cloud-work, main 미푸시)
1. `356b5eb` — A-1·A-2 폭 기준·글자 레이어
2. `2337ad3` — A-3·A-4·A-5 신뢰도·읽기 순서·품질 메타
3. `7e2159a` — B OcrReview517
4. `5251cb8` — C·D FindingBody518·번호·게이팅
5. `f2753c4` — E 하드클레임 + 테스트·보고서

## A. 읽기 품질
### A-1 폭 기준 축소
- 원인: `fitLongEdge508(…, 4000)`이 세로 긴 페이지를 통째로 줄여 폭 ~420px.
- 수정: `fitWidth518` / `OCR_TARGET_WIDTH_518=1800`·폴백 1500·1200, PDF 세로 구간 렌더(`transform` offset), 캔버스 16MP 상한, JPEG 0.92.
- 회귀: 595×5678pt → 폭≥1500·타일≤20·스트립≤16MP; 가로 긴·A4·작은 판형.

### A-2 글자 레이어 우선
- 기준: `charCount≥40` 그리고 `hangulCount≥10`(기존 `MIN_CHARS_483` / `MIN_HANGUL_CHARS_485`).
- `decideTextLayer518`: 충분·비혼합이면 OCR API 생략. 일부 빈 페이지면 `NOTICE_OCR_MIXED_TEXT_518` 후 OCR.

### A-3 신뢰도
- 줄 `<0.75` → `lowConfidence`·노란 미리보기·「확인」표식.
- 평균 `<0.6` 또는 비정상 글자 비율 → 기존 unreadable 흐름(`blockForLowQuality`).

### A-4 읽기 순서
- `orderWordsToLines518`: y겹침 50% → x정렬, 간격≥타일폭 12%면 단 분리(목업 테스트).
- CLOVA는 lineBreak 줄을 유지한 채 줄 안 단어만 x정렬(전면 재클러스터는 기존 줄 구성 회귀를 깨서 제한).

### A-5 품질 메타
- 화면 전용 `ocrQuality` / `qualityLabel`(예: 읽기 품질: 보통(평균 0.82)). 원문 저장·로그 없음.
- 상세페이지 UI 단서 ≥2 → 안내 + 광고만 제안 버튼(자동 전환 없음).

## B. OcrReview517
- 새 컴포넌트(구 `OcrReviewCard508` 유지). 무대 `reviewSlot`, textarea min-height 320px, 주/보조 알약 버튼.

## C. FindingBody518
- why + wording/missing/measure 블록. 다크/라이트 반투명. 취소선·안쪽 흰 상자 제거. `classifyFinding512` 유지.

## D. 번호·게이팅
- `buildRows518`: 고칠→확인→못함→직접확인→문제없음 연속 번호(접혀도 재매김 없음).
- 샘플에 `applyGatingToStaticResult518`(옵션 미선택 시 수출/세트/색조 → 뺀 항목, 개정안 → 참고).
- 직접 확인 >3 접기.

## E. 하드클레임
- 원인: 정규화 후 `"주름을완전히없애주는"`은 `/완전제거/`에 안 걸림. `피부 재생`만 히트.
- 보강: `완전히?없애`, `주름…없애|제거` (기존 HARD-KR-510). 제외: `주름 개선에 도움`, `메이크업을 완전히 지워 주는`.

## 테스트
- `npx tsc --noEmit` 통과.
- `npm run regression:label-check` — 518 포함 스위트 통과 목표.
- 새 스위트: `scripts/regression/label-check-518.ts`.

## 한계
- 2단 재구성은 목업·헬퍼로 검증. CLOVA 실응답에 전면 재적용하지 않음.
- 실제 월 한도·8s·6타일 배치는 기존 509 로직 재사용(호출 수 증가 시 usage 집계는 단위 테스트·기존 회귀에 의존).
