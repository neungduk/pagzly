# 478차 목표 (코드 전에 확정, 낮추지 않는다)

측정: 말뭉치 × 아키타입 8, V5 켜짐. 가짜 사진 갤러리(`--ph2 --localize-blocked --photos=partial`) + Playwright 렌더 대비. 기준선은 477 tip(`35ed952`). V5 off = 477 바이트 동일.

| # | 지표 | 기준선(477) | 목표 |
|---|---|---|---|
| A1 | 렌더 픽셀 대비 검사기 | 없음(토큰만) | 4×8×(750,390) 텍스트 노드 픽셀 샘플 + WCAG |
| A2 | 본문/큰글 기준 | — | 본문 ≥4.5, 큰 글자 ≥3.0 (`data-pz-deco` 제외) |
| B1 | 면+글자색 동시 결정 | 면만 어둡고 ink 잔존 | `--pz-surface`/`--pz-on-surface` 쌍 |
| B2 | impact/narrative/pop × 어두운 상품 | 실패 수십~수백 | 렌더 실패 **0**(장식 제외) |
| C1 | 회귀 짧은 모드 | 없음 | 4×8×750 실패 0, run-all 등록 |
| C2 | 극단 팔레트 픽스처 4 | 없음 | 노랑/남색/형광녹/무채 통과 |
| E1 | export / living | 139.2 / 134.8 | ≤140 / ≤135 |
| E2 | run-all 실패 4건 | 실패 | **미착수** |

캡처(커밋 금지): `review/478-captures/`.
노트·리뷰·보고(커밋): `review/478-notes.md`, `review/478-review.md`, `review/478cha-report.md`.
