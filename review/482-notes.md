# 482차 노트 — 톤앤매너·팔레트 현황

## 현재 톤앤매너 추출 (`lib/color-extract.ts` → `extractProductTheme`)
| 항목 | 482 이전 | 482 이후 |
|------|----------|----------|
| 입력 | 업로드 사진 URL 최대 3장 | 동일 |
| 샘플 영역 | 중앙 60% → 48×48 | **컷아웃(알파) 있으면 전체+α≥200만**, 없으면 중앙 60% |
| 알파 | `.removeAlpha()` — 마스크 미사용 | `ensureAlpha` + 투명 제외 |
| 유채색 가중 | 채도 s | **채도²** + 무채 지배 시 ×3 |
| 주조 선정 | 최다 가중 버킷 1개 | **K=3 군집** 후 가중≥22% 후보 중 **평균 채도** 우선 |
| 산출 | accent/… | 동일 + `extractProductPaletteClusters` / `ProductPalette482` |

## live-481 (e8c1c270…) 실측
| | 값 |
|--|----|
| DB 저장 theme | accent `#20547E`, baseNeutral `#A7BED0` (스튜디오 청회색) → `themeDb481`으로 보존 |
| CDN 재추출(enhanced 3장) | accent `#AA933F` (hue ≈47°, 노란 오일) |
| 원인(이전) | 연청 백드롭이 중앙 크롭에도 넓고 s≥0.18이라 weight 1위. 노란 내용물은 2위(약 30% weight·더 높은 meanSat) |
| 픽스처 `theme` | 재추출값으로 갱신(유료 재생성 없음, 사진 CDN 읽기만) |

## 렌더 배선
- `paletteFromTheme482(theme)` → `colorRolesV5(..., palette)` (export + DetailSectionRenderer)
- hue 이동·포인트는 팔레트 주조 **±25°** 안으로 클램프
- `lib/palette-from-product-482.ts`: 주조·보조·어두운 면·포인트 고정

## 같은 결과 미리보기
DB `theme`이 아직 `#20547E`이면 화면 accent는 구값. 픽스처·신규 추출 경로·export(픽스처)로 A를 검증. B~D는 같은 결과에서 바로 확인 가능.
