# 483차 보고 — 화장품 표시사항 PDF 자동 검수 MVP

## 확인하지 못한 항목
- **OCR 미지원**: 이미지 스캔 PDF는 "텍스트를 읽을 수 없어 확인 불가"만 안내.
- **규칙표·알레르기 한글명 미검증**: `kr_label_rules_draft_v0.1.json` / `allergens-kr-25_draft.json`은 초안. 고시·성분사전과 대조 필요.
- **글자 크기 5pt**: PDF에서 `/Tf` 크기를 추정할 수 있을 때만 검사. 임베드 폰트·벡터 텍스트 없는 경우 "확인 불가".
- **ai/manual 규칙(약 20건)**: 목록만 표시, 자동 판정 없음.
- **결과 PDF 저장·Production 배포·유료 API**: 하지 않음.
- **사용자 원본 입력 자료**: 워크스페이스에 없어 동일 경로에 초안 규칙·샘플 PDF를 생성해 사용(가상 브랜드).

## 목표 / 실측

| 목표 | 실측 |
|------|------|
| `/label-check`만 추가 | `app/label-check/page.tsx`, `app/api/label-check/route.ts` |
| PDF≤10MB 메모리 처리·DB 미저장 | API FormData → Buffer → 응답 후 폐기, 본문 로그 없음 |
| code 규칙만 자동 | 규칙표 `check_type=code` 실행, ai/manual은 "수동 확인 필요" |
| 단정 "위반" 금지 | 상태: 위반 가능/확인 필요/확인 불가/통과 + 면책 문구 |
| 샘플 A | 사용기한 누락, 재생·완전 제거 확인 필요, 리모넨·리날룰 확인 필요 |
| 샘플 B | 기능성 표기·제조번호 확인 필요 |
| 샘플 C | 대부분 통과 + 피부 장벽 강화 확인 필요 |
| 회귀 | `label-check-483` 통과, run-all 등록 |

## 변경 파일
- `review/TASK_483.md`, `review/483-targets.md`, `review/483cha-report.md`
- `review/data/kr_label_rules_draft_v0.1.json`, `allergens-kr-25_draft.json`, `samples/*.pdf`
- `lib/label-check/{types,extract-pdf,load-rules,run-check}.ts`
- `app/label-check/page.tsx`, `app/api/label-check/route.ts`
- `scripts/build-label-samples-483.mjs`, `scripts/regression/label-check-483.ts`, `run-all.ts`
- `.gitignore` — `review/data/**/*.json` 예외

## 켜는 법
1. `cloud-work`에서 앱 실행 후 `/label-check` 접속.
2. PDF 업로드 → 씻어내는/안 씻어내는·기능성 선택 → 검수 시작.
3. 인쇄용으로 보기(브라우저 인쇄). 로그인·DB 불필요.

## 남은 문제
- 초안 규칙/알레르기 검증, OCR, 결과 PDF보내기, 함량 기준 자동 판정.
- 샘플 PDF는 UTF-8 마커+pdf-parse 병합 방식(한글 폰트 미임베드). 상용 라벨 PDF는 추출 품질이 파일마다 다름.

## Push
- branch: `cloud-work` → `origin/cloud-work` (main 미푸시)
- tip: `548816a` (`docs(483): track draft rule JSON and cha report`). 항목: `2cf6844` 샘플 → `245d58a` 추출 → `cdb1dd1` 규칙 → `751e404` UI → `c57e791` 회귀.
