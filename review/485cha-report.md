# 485차 보고 — 업로드 안전장치 · 글자 없음 안내 · 1장 인쇄

## 확인하지 못한 항목
- **IP 호출 제한(서버리스)**: 인메모리 분당 10회(`SlidingWindowLimiter`). 인스턴스별·콜드스타트 시 초기화되므로 **완전 제한이 아니라 1차 완충**. 공유 저장소(WAF/Upstash 등)는 미적용.
- **추출 20초 타임아웃**: Promise.race로 적용. 극단적으로 느린 PDF 실측은 별도 부하 시험 없음.
- **암호화 PDF 전용 샘플**: pdfjs 예외 메시지를 열 수 없음으로 매핑. 별도 암호 PDF 파일은 저장하지 않음.
- **OCR**: 아웃라인/스캔은 안내만(유료 OCR 금지).
- **상세페이지 run-all 전체 녹색**: label-check 회귀만 갱신·통과. 상세 코드 미변경.

## 목표 / 실측

| 목표 | 실측 |
|------|------|
| `%PDF-` 시그니처 | 비PDF 거절 문구. 확장자만으로는 통과 불가 |
| ≤10MB·≤10쪽·≤20초 | 서버 검증. 11쪽 → 거절. 타임아웃 → 408 문구 |
| IP 분당 10회 | 메모리 제한. 서버리스 한계는 위 항목 |
| 로그 파일명·본문 금지 | route는 `readable`/`findings` 수만 기록 |
| 0자/한글&lt;10 | 아웃라인 안내만, findings 0 (`gen_empty_notext`) |
| 영문만 | 한글 미검출 안내 + 판정 보류 (`gen_helvetica_nohangul`) |
| 인쇄 A4 | 제품명(선택)·점검일·요약 4칸·항목·하단 면책, `인쇄/PDF로 저장` |
| 가로 넘침 | min-width 넓은 표 제거, break-words·max-w-3xl |
| 회귀 | `label-check-483.ts` 통과(시그니처·11쪽·빈·영문·로그·인쇄) |

## 변경 파일
- `review/TASK_485.md`, `485-targets.md`, `485cha-report.md`
- `lib/label-check/{types,safe-upload,extract-pdf,run-check}.ts`
- `app/api/label-check/route.ts`, `app/label-check/page.tsx`
- `scripts/regression/label-check-483.ts`

## 남은 문제
- 서버리스 공유 rate limit, OCR, 암호 PDF 전용 픽스처.
- 기존 상세 run-all 실패분은 별도 차수.

## Push
- branch: `cloud-work` → `origin/cloud-work` (**main 미푸시**)
- tip: `a8c866a`
- 항목: targets `6cf863d` → A `10937e4` → B `4bc46c8` → C `4bbb7e6` → D `01e960b` → E `a8c866a`
