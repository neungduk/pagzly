# 508차 설계 (코드 전)

## 목표
(A) 글자 없음/거의 없음 → "문제 없음" 오해 금지(`unreadable`/`partial`).  
(B) Vision OCR(REST)로 캡처·실사진 글자 읽기 → 고객 확인 → 기존 점검 흐름. 실제 키·네트워크 호출·`.env` 열람 금지(테스트는 fixture).

## 상태표

| readStatus | 조건(요약) | 화면 |
|---|---|---|
| unreadable | 공백제외 &lt;20자 / 글자쪽비율&lt;50%·&lt;200자 / OCR 평균신뢰&lt;0.6·&lt;200자 | 제목 "글자를 읽지 못해 점검하지 못했어요" · 점수칸·초록·"발견된 항목이 없어요" 금지 · OCR/붙여넣기 CTA |
| partial | 빈 쪽 있음 + 읽을 글자 충분 | 노란 배너 + 빈결과 시 "읽은 부분에서는 발견된 항목이 없어요" |
| ok | 그 외 | 기존 507 |

## 파일·흐름

### A
- `lib/label-check/read-status-508.ts` — 판정
- `run-check.ts` / `run-check-us.ts` — 결과 필드 부여, noticeOnly→unreadable
- `types.ts` — `readStatus`, `pagesWithText/pagesTotal`, `avgOcrConfidence?`
- `ui-status-507.ts` + `ResultView` — 제목·배너·CTA
- API `finishResult` — unreadable 저장 금지
- `scripts/regression/label-check-508-unreadable.ts`

### B
- `lib/label-check/ocr/*` — provider, vision REST, normalize, slice(순수), merge, to-extracted, usage
- `POST /api/label-check/ocr` (+ GET available), maxDuration Hobby 이내
- 클라: pdfjs/이미지→JPEG 조각→4MB 배치→확인 UI→text full 점검
- 마이그레이션만: `supabase/migrations/20261110100000_label_ocr_usage.sql` (**적용 안 함**)
- `review/508-privacy-note.md`
- `scripts/regression/label-check-508-ocr.ts`

## 환경변수(이름만)
`GOOGLE_VISION_API_KEY` · `LABEL_OCR_MONTHLY_LIMIT`(기본 900) · `LABEL_OCR_PER_USER_DAILY`(기본 30, 비회원 5)

## 비목표
실제 Vision 호출, 규칙 JSON 수정, 원본/응답 로그·저장, sizePt 추정 판정, HEIC, main push.
