# 132차 리포트 — 일러스트/아이콘 프롬프트 고급화 (flux-schnell 유지)

생성: 2026-09-07  
모델: **flux-schnell만** (seedream-3/qwen-image 호출 0)  
단가: **$0.003/장** 불변  
참고: `.env.local`에 `ICON_MODEL=qwen-image`가 있으나 검증 스크립트가 `flux-schnell`로 강제. 코드 기본값(`getIconModel`)은 변경하지 않음.

## 변경 요약

| 파일 | 내용 |
|------|------|
| `lib/concept-icons.ts` | 품질 디스크립터 3줄 추가, flux `output_quality` 85→95 |
| `lib/concept-illustration.ts` | editorial/sharp/grading 품질 문구 추가, `NO_TEXT_LOCK`은 배열 끝 유지 |
| `lib/concept-brief.ts` | `icon_style`/`decor_prompt` 지시문만 구체화 (JSON 스키마 불변) |

qwen 분기 `output_quality`는 미변경(이번 호출 대상 아님).

## [cost] 모델·단가 증거

원문: `review/132cha-cost-evidence.txt`

**before / after 공통:**
- `ICON_MODEL=flux-schnell ($0.003/장)`
- `[cost] generateConceptIcons model=flux-schnell (4/4 icons): $0.0120`
- `[cost] generateIllustrationBanner (flux-schnell): $0.0030`
- phase total ≈ **$0.0300** × 2 = **~$0.06** (카테고리 2 × 아이콘4+배너1)

qwen/seedream 문자열: 로그에 **없음**.

## Before / After 육안 코멘트

스크린샷: `review/132cha-{before,after}-{cosmetics,electronics}-{icon-*,banner}.png`

| 샘플 | 관찰 |
|------|------|
| cosmetics checklist | before: 물방울 단일 모티프, 깔끔. after: 선 굵기·스파클·드롭 조합이 더 앱 아이콘 톤, PNG 용량↑ (품질 파라미터+디테일). |
| cosmetics banner | before: 상단 여백 넓고 하단 웨이브. after: 풀필드 블루 그라데이션·메쉬 텍스처로 editorial 밀도↑, 중앙 empty 유지. |
| electronics checklist | before: 한자 유사 글리프(텍스트 잠금에 아슬). after: 기하 심볼+소프트 섀도로 더 정돈된 배지. |

완전 deterministic이 아니라 샘플마다 모티프는 달라질 수 있으나, after 쪽이 전반적으로 **선명도·마감·잡음 억제**가 나아 보임.

## tsc / diff

`review/132cha-tsc-output.txt` → `EXIT_CODE=0`

`review/132cha-git-diff-stat.txt`:
```
 lib/concept-brief.ts        | 4 ++--
 lib/concept-icons.ts        | 5 ++++-
 lib/concept-illustration.ts | 2 ++
 3 files changed, 8 insertions(+), 3 deletions(-)
```
(+ 검증용 `scripts/132cha-icon-illustration-ab.ts` untracked)

## 체크리스트

- [x] concept-icons 품질 디스크립터
- [x] flux output_quality 95, 단가 $0.003 불변
- [x] concept-illustration 품질 문구 + NO_TEXT_LOCK 유지
- [x] concept-brief 지시문 보강 (스키마 불변)
- [x] 카테고리 2곳 before/after 스크린샷
- [x] [cost] flux-schnell / $0.003 확인
- [x] tsc EXIT_CODE=0
- [x] git diff --stat 첨부
