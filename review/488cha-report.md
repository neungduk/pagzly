# 488차 보고 — 탭 제목 · "찾은 내용" 표시 다듬기

## 확인하지 못한 항목
- **Vercel 프리뷰 빌드 성공**: push 후 기획 담당 확인. 로컬 `tsc`/`npm run build`만 통과.
- **실브라우저 탭 제목·조각 가독성**: 로컬 회귀·샘플 JSON으로 검증. 프리뷰 URL 육안은 기획 담당.

## 목표 / 실측
| 목표 | 실측 |
|------|------|
| title `화장품 표시사항 PDF 검수 \| Pagzly`, description 한 줄, noindex 유지 | `app/label-check/layout.tsx` 반영. 상세 메타 미변경 |
| 조각 ≤60, 경계 절단+`…`, 구분 ` · `, 통과는 "표기 확인됨" | `format-found.ts` + `run-check` 표시 헬퍼. 판정 상태 불변 |
| 샘플 JSON 동일 규칙 | `sample-result-a.json` 재생성 |
| 회귀: title·조각·통과 미노출·A/B/C 집계·가로넘침 | `label-check-483` 통과 |
| `tsc` / `build` | 둘 다 통과 (55 routes) |

## 변경 파일
- `app/label-check/layout.tsx`
- `lib/label-check/format-found.ts` (신규)
- `lib/label-check/run-check.ts`
- `lib/label-check/sample-result-a.json`
- `scripts/regression/label-check-483.ts`
- `review/488-targets.md`, `488cha-report.md`

## 남은 문제
- 판정 로직/규칙 추가는 이번 범위 밖(표시만).
- 긴 본문에서 히트 주변 창이 여전히 여러 라벨을 ` · `로 이어 붙일 수 있음(길이·경계 규칙은 충족).

## 빌드
| 명령 | 결과 |
|------|------|
| `npx tsc --noEmit` | 통과 |
| `npm run build` | 통과 (TypeScript Finished, 55 routes) |
| `npx tsx scripts/regression/label-check-483.ts` | 통과 |

## Push
- branch: `cloud-work` → `origin/cloud-work` (**main 미푸시**)
- tip: `16fa6e3`
- 항목: targets `f0e08a9` → A `9d56504` → B `65ee5cd` → sample `0f19e32` → C `e986148` → D `16fa6e3`
