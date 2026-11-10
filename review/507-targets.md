# 507차 화면 구성표 (코드 전)

## 목표
비전문가가 1분: 올리기 → 고칠 곳 확인 → 문구 복사 → 다시 점검. 시안 `label-check-ui-507.html` 구조·위계·톤. 판정/규칙 데이터 변경 없음.

## 화면·컴포넌트·상태

| 화면 | 컴포넌트 | 상태 |
|---|---|---|
| `/label-check` (게스트) | `LabelCheckUploadCard`, `LabelCheckResultView`, 하단 고정바 | idle / busy(단계문구) / result / error |
| `/label-check/new` (회원) | 동일 + 제품명·내 결과 링크 | + saved 표시 |
| `/label-check/history/[id]` | `LabelCheckResultView` (summaryOnly: 찾은 문구 숨김) | 저장본 |

### UploadCard
1. 제목 + 3단계 칩 2. 시장 세그(KR/US) 3. PDF 드롭존 4. 또는 문구 붙여넣기+scope 5. 제품정보 details 6. CTA 7. 면책. PDF∩텍스트 시 PDF 우선 안내.

### ResultView
결론 문장 3분기 · 숫자4칸→탭 · 탭(기본=최심각 유건) · 항목카드(칩·evidence mark·fix 펼침·복사·exception·근거) · 다시점검 · 회원/게스트 안내 · ad_only 배너.

### 표기 매핑
possible→고칠 것 / attention→확인할 것 / unknown→확인 못 함 / pass→문제 없음 / manual→직접 확인(확인할 것 하단).

## 재사용·교체
- 신규: `components/label-check/ui-507/*` (UploadCard, ResultView, StatusChip, FixBlock, BottomBar, css vars).
- 기존 `ResultPanel.tsx`·게스트 page 인라인 UI: 교체 사용, 파일 삭제는 안 함(보고).
- API·run-check·규칙 JSON: 변경 금지(표시만).

## 비목표
다크모드, 507 밖 상세/결제, 새 npm 의존성, main push.
