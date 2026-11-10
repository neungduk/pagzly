# 507차 보고서

## 확인하지 못한 항목
- 브라우저 실측(폭 320/390, 키보드 탭·복사, 포커스 링) — **미실시**(추정으로 통과 처리하지 않음).
- 색 대비는 계산값만 기재(실기기 측정 아님).
- `ResultPanel.tsx` 등 구 UI 실사용 경로 잔존 여부 전수 런타임 추적 미실시(정적 교체만 확인).

## 화면 구성표
`review/507-targets.md` 참고. 게스트 `/label-check`, 회원 `/label-check/new`, 저장본 `/label-check/history/[id]`가 `UploadCard507`·`ResultView507` 공유.

## 재사용·교체·미사용
| 구분 | 경로 |
|---|---|
| 신규 | `components/label-check/ui-507/*`, `lib/label-check/ui-status-507.ts`, `lib/label-check/product-type-options-504.ts` |
| 교체 사용 | `app/label-check/page.tsx`, `new/page.tsx`, `history/[id]/page.tsx` |
| 미사용(삭제 안 함) | `components/label-check/ResultPanel.tsx` 및 구 인라인 카피 |
| 판정/규칙 | 변경 없음(표시·표기만). `PRODUCT_TYPE_OPTIONS_504`는 클라이언트 안전 분리(re-export 유지) |

## 대비 계산(대략)
| 쌍 | 전경 | 배경 | 대략 비 |
|---|---|---|---|
| 본문 | `#1c2430` | `#f6f4ef` | ~14.4:1 |
| 보조 | `#5b6573` | `#f6f4ef` | ~5.3:1 |
| CTA | `#ffffff` | `#1f4d3f` | ~8.5:1 |
| 고칠 것 | `#b3261e` | `#fbe9e7` | ~5.6:1 |
| 확인할 것 | `#8a5a00` | `#fdf1d6` | ~4.7:1 |
| 문제 없음 | `#1f6b3a` | `#e3f3e8` | ~4.9:1 |

본문·칩 글자 목표 4.5:1 이상(계산). 실기기 측정은 미실시.

## 시험
- `npx tsc --noEmit` 통과
- `npm run build` 통과
- `npm run regression:label-check` **17/17** (507 스위트 포함)
- 구 정적 검사(483·494·496)는 507 공유 컴포넌트 경로를 보도록 갱신

## 커밋·push
- 브랜치: `cloud-work` only (main 미push)
- 커밋:
  - `275bdd9` docs(507): targets
  - `f5d721a` feat(507): ui-507 components
  - `82f7005` feat(507): wire pages
  - `cc15a35` test(507): regression
  - `7834acd` docs(507): cha-report
- tip: `7834acd` (push 확인 후 동일 유지 예정)
