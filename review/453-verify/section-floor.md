# 섹션 종류별 완성도 전/후 (453차)

합성 21종 × 390폭, 최상위 구간 500개. 점수 = 100 − 8×외톨이 − 20×겹침 − 15×넘침 − 빈 띠×120(정의는 `scripts/section-floor.ts` 머리 주석). 구간 수 2 미만 종류는 표에서 제외.

## 하위 5종(전 기준)
| 종류 | 구간 수 | 전 평균 | 전 최저 | 전 외톨이 | 후 평균 | 후 최저 | 후 외톨이 |
|---|---|---|---|---|---|---|---|
| v4:spec.line | 21 | 94.7 | 68 | 14 | 99.2 | 92 | 2 |
| v4:concern.stack | 5 | 95.2 | 92 | 3 | 95.2 | 92 | 3 |
| section | 64 | 98.6 | 84 | 6 | 98.6 | 84 | 6 |
| impact:faqcards | 21 | 99.0 | 98 | 0 | 99.0 | 98 | 0 |
| hero:B | 9 | 99.1 | 92 | 1 | 99.1 | 92 | 1 |

## 전 종류 전/후(평균 점수, 구간 수 ≥2)
| 종류 | 전 | 후 | 차이 |
|---|---|---|---|
| v4:spec.line | 94.7 | 99.2 | +4.6 |
| v4:concern.stack | 95.2 | 95.2 | +0.0 |
| section | 98.6 | 98.6 | +0.0 |
| impact:faqcards | 99.0 | 99.0 | +0.0 |
| hero:B | 99.1 | 99.1 | +0.0 |
| pagzly-persona | 99.2 | 99.2 | +0.0 |
| v4:benefits.numcards | 100.0 | 100.0 | +0.0 |
| impact:bubbles | 100.0 | 100.0 | +0.0 |
| v4:story.linetime | 100.0 | 100.0 | +0.0 |
| impact:illust-center | 100.0 | 100.0 | +0.0 |
| impact:number | 100.0 | 100.0 | +0.0 |
| info:quick | 100.0 | 100.0 | +0.0 |
| pagzly-textonly | 100.0 | 100.0 | +0.0 |
| info:points | 100.0 | 100.0 | +0.0 |
| pagzly-illustration-banner | 100.0 | 100.0 | +0.0 |
| v4:phototext.overlap | 100.0 | 100.0 | +0.0 |
| v4:touch.band | 100.0 | 100.0 | +0.0 |
| impact:chipwall | 100.0 | 100.0 | +0.0 |
| impact:textboost | 100.0 | 100.0 | +0.0 |
| info:steps | 100.0 | 100.0 | +0.0 |
| impact:asym2 | 100.0 | 100.0 | +0.0 |
| impact:illust-side | 100.0 | 100.0 | +0.0 |
| impact:note | 100.0 | 100.0 | +0.0 |
| pagzly-gallery | 100.0 | 100.0 | +0.0 |
| v4:breather.motif | 100.0 | 100.0 | +0.0 |
| info:buy | 100.0 | 100.0 | +0.0 |
| hero:A | 100.0 | 100.0 | +0.0 |
| v4:concern.tiles2 | 100.0 | 100.0 | +0.0 |
| v4:story.editorial | 100.0 | 100.0 | +0.0 |
| impact:checkrows | 100.0 | 100.0 | +0.0 |
| v4:benefits.zigzag | 100.0 | 100.0 | +0.0 |
| v4:phototext.caption | 100.0 | 100.0 | +0.0 |
| impact:timeline | 100.0 | 100.0 | +0.0 |
| impact:sizebars | 100.0 | 100.0 | +0.0 |
| v4:spec.grid | 100.0 | 100.0 | +0.0 |
| pagzly-cta | 100.0 | 100.0 | +0.0 |
| hero:C | 100.0 | 100.0 | +0.0 |
| v4:benefits.iconstrip | 100.0 | 100.0 | +0.0 |
| impact:inset | 100.0 | 100.0 | +0.0 |
| v4:phototext.offset | 100.0 | 100.0 | +0.0 |
| v4:phototext.arch | 100.0 | 100.0 | +0.0 |
| v4:story.quote | 100.0 | 100.0 | +0.0 |
| info:stat | 100.0 | 100.0 | +0.0 |
| info:statnum | 100.0 | 100.0 | +0.0 |
| hero:D | 100.0 | 100.0 | +0.0 |
| impact:swatch | 100.0 | 100.0 | +0.0 |
| pagzly-color-variation | 100.0 | 100.0 | +0.0 |
| impact:split | 100.0 | 100.0 | +0.0 |
| v4:phototext.collage | 100.0 | 100.0 | +0.0 |
| v4:benefits.bento | 100.0 | 100.0 | +0.0 |
| pagzly-stacked | 100.0 | 100.0 | +0.0 |

평균이 내려간 종류: 0개.

## 원인과 조치(v4, 문구 불변)
- **사이즈 실측표(`v4:spec.line`) 평균 94.7·최저 68**: 값 칸의 긴 글이 「… 소매길이 21 / (cm)」처럼 단위·숫자만 다음 줄로 떨어지는 외톨이 14건(줄 폭 201px). export 마지막 HTML에서 「라벨 span + 값 span」 줄과 표 값 칸의 긴 글(14자 이상)의 마지막 두 어절을 `white-space:nowrap`으로 묶었다(`lib/typo-v4.ts` `bindLast`, 글자 불변) → 외톨이 14 → 2, 평균 94.7 → 99.2·최저 68 → 92.
- **하위 종류의 나머지 원인**(concern.stack 인용 문장·persona 목록·phototext.collage 설명): 마지막 줄 1~2글자 외톨이가 각 1~3건뿐이고 겹침·넘침·빈 띠는 0이다. `<p>`·`<li>` 전체에 같은 묶음을 쓰면 **AI 생성 콘텐츠 안내 같은 고지 문구 마크업이 바뀌어**(고지 불변 규칙) 회귀 `twin-sections`가 실패해 되돌렸다 — 고지가 섞이지 않는 범위가 아니라 일부러 적용하지 않았다.
- 눈 검수 시트: `section-sheet/sheet.jpg`(왼쪽 전·오른쪽 후; 실사진이 아닌 합성 입력 풍부·보통·빈약 6세션 × 5종 중 있는 13장). FAQ 카드는 전/후 동일(점수 99 → 99).
- 이번 지표에는 **겹침 0·넘침 0**(전 종류)이라 구조적 결함은 없다. 점수 차이는 사실상 외톨이 줄과 빈 띠뿐이다. 빈 띠 지표는 첫 정의(12px 격자 면적)가 의도적인 여백 구간(breather 모티프)을 최하위로 만들어 세로 틈 합집합 방식으로 고쳤다.
