# 467차 진행 현황
466차 완료(`review/466cha-report.md`) 후 시작.
| Phase | 상태 |
|---|---|
| 0 진단·조사·목표 | 완료 (`docs/dynamics-audit-467.md`, `scripts/dynamics-metrics-467.ts`) |
| 1 부품 라이브러리 | 완료 — `lib/dynamics-v5.ts` 부품 30종(스케일 3·깊이 4·기울임 5·이음새 6·필기 4·구성 8), 회귀 `dynamics-467`(극단 입력·금지 CSS·장식 속성·넘침 래퍼·새 글자 없음) |
| 2 초점 규칙·레이어 | 1차 완료 — `lib/dynamics-layer-v5.ts`(계획 `planDynamicsV5` + 적용 `applyDynamicsHtml`): 큰 배경 순번/제목 첫 단어, 기울인 판, 스티커·테이프, 카드 변주, 이음새 도형(자기 색으로 위 섹션 쪽으로 솟음)·걸침. 대상: v4 블록 + 글 위주 기존 임팩트. 일반 섹션·변형별 레시피는 Phase 3. 회귀 `dynamics-467`에 레이어 검사 추가. 지표 ⑤ 정정(docs §5) |
| 3 일반 섹션 V5 단일 소스 | 완료(3종) — stat_infographic→stats(bignum·trio·rings), gallery→gallery(mosaic·polaroid), image_text text_only→story. 조건·원문 보존 회귀. 나머지는 사유와 함께 미변환(docs §6) |
| 4 페이지 레벨 | 대부분 완료 — 이음새(5종, 자기 색 도형이 위 섹션 쪽으로 솟음)·걸침·티커 띠(최대 1)·상한. 직선 이음새 비율은 일부 목표 미달(docs) |
| 5 사진 틀·질감 | 부분 완료 — 사진 틀 모서리 6종 변주·배경 질감 3종(점·줄무늬·모눈)·기울인 판. 사진 틀 종류 목표는 페이지당 사진 틀 5.4개가 상한이라 미달. 아이콘 구성 레시피는 미착수 |
| 6 모션 | 건너뜀 — PNG 다운로드가 라이브 DOM을 복제(html-to-image)하므로 모션 CSS가 PNG에 새지 않는다는 보장을 코드로 확인하지 못함 |
| 7 ph2 placeholder·갤러리 옵션 | 남음 |
| 8 안전망·지표 | 남음 |
| 9 문서·보고서 | 남음 |

## 막힘
(없음)
