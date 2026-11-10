# 510차 보고서 — 판정 정확도 보강 3건

## 확인하지 못한 항목
- 실제 OCR·실사진 브라우저 렌더(320/390) — 미실시(정적 CSS·문구만).
- 파일럿 PDF A에서 possible로 승격된 광고 1건의 원문 히트 문구 — summary 수치로만 확인.
- US us2 PDF 원문에서 어떤 패턴이 disease로 잡히는지 전문 재열람 안 함(상태 필터만 완화).

## 1. 2-1 현재 구조 분석

### 왜 "확인할 것"이었나
- `ad-phrases.ts`는 JSON(`ad-phrases-kr_draft_v0.2`) 패턴 일치 시 **항상 `status:"attention"`**.
- `ad-exceptions.ts`는 문장 단위로 `exception_possible`/`not_applicable` 등을 붙여 **낮추거나 제외**할 뿐, 상태를 possible로 올리는 경로가 없음.
- 예: "피부 재생"→MFDS-003 attention, "여드름을 치료합니다"→MFDS-002(여드름 패턴) attention.
- **"치료에 효과"·"완전 제거"** 는 JSON 패턴에 없어 **지적 자체 0건**이었음.

### 올린 문구(possible / 고칠 것)
- 치료에 효과, 치료합니다/할, 완치, 치유
- 피부 재생·재생시켜 등, 영구적으로, 완전 제거
- 질병명(아토피·여드름 등)+치료/예방/완치/치유
- JSON 누락분 gap 스캔으로 보충(치료에 효과·완전 제거·완치·영구적으로)

### 안 올린 문구(그대로 / 승격 금지)
- 보습, 피부 결 개선, 윤기
- 주름 개선(기능성·attention 유지, possible 금지)
- 예외 soft(`exception_possible`)·색조 pending 이 붙은 히트는 승격하지 않음

### 확신 없어 확인할 것으로 남긴 것
- 단독 "개선"·"예방"(질병명 없이)
- "항균"·"살균" 단독(기존 attention·실증 경로)
- "콜라겐"·"디톡스" 등 실증 가능 항목(MFDS-003 needs_evidence)

## 2. 작업별 파일

### 2-1 KR 효능
- `lib/label-check/ad-hard-claims-510.ts` (신규)
- `lib/label-check/ad-phrases.ts`

### 2-2 사용기한 값
- `lib/label-check/run-check.ts` (`expiry` 모드)
- 키워드만 / "별도 표기 없음" → attention + "값을 찾지 못했어요."
- 제조일로부터 N·개봉 후 12M·연월일 등 값 있으면 pass
- 기존 시험(사용기한 누락 possible 등) **깨지지 않음** — 중단 없음

### 2-3 US
- `lib/label-check/ad-phrases-us.ts` + hard-claims (cure/permanently/FDA approved 등)
- 히트 단위만 승격(문서 전체 오염 방지)

### 2-4 OCR 확인 화면
- `lib/label-check/ocr/constants.ts`
- `components/label-check/ui-507/OcrReviewCard.tsx`
- `app/label-check/page.tsx`, `app/label-check/new/page.tsx`

### 2-5 테스트
- `scripts/regression/label-check-510b-accuracy.ts` (신규) · suites 등록
- 기존 스위트: attention-only 필터를 possible 허용으로 맞춤(483 summary A, 493/497/500)
- `label-check-ocr-fix-510.ts` **미수정**(지시서)

## 3. 검증
- `npx tsc --noEmit` / `npm run build` / `regression:label-check` **22/22**

## 4. 커밋·push (cloud-work only)
`git log --oneline` 확인 해시:
- `6b45c0d` feat(510): elevate hard medical claims and require expiry values
- `45feca2` feat(510): simplify OCR review copy and partial paste CTA
- `2cfa21b` test(510): accuracy suite and allow possible on ad status checks
- tip: `docs(510): cha-report` (push 직후 `git log -1 --oneline`)
