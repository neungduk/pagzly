# 241차 — export stat_infographic ring을 원형 게이지로 수정

생성: 2026-09-23 · 유료 API **0** · 파일 1개

## 한줄 결론

export에서 `style:"ring"`이 막대바로 떨어지던 버그를 고침. 라이브 RadialGauge와 동일 기하(112×10) SVG + CSS `ringFill` 애니메이션.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/export-detail-html.ts` | `stat_infographic`에 `ring` 분기 추가; `.ring-fill` keyframe + reduced-motion |

무변경: `DetailSectionRenderer.tsx`(mtime 확인), number/bar 분기 로직, comparison_chart

---

## 2. 검증

`npx tsx scripts/241cha-stat-infographic-ring-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| 기하 radius/circumference/offset | 0·50·100·클램프 OK |
| mixed fixture | ring-fill×2, fill-bar 유지, number statNumber 유지 |
| dashoffset 30/80 | 소수점 2자리 일치 |
| ring 각주 | mark + 하단 목록 |
| DetailSectionRenderer mtime | 불변 |
| 231/232/236/237/238 | ALL PASS |

샷: `review/241cha-stat-infographic-ring/ring-gauge-export.png`

API generate: 0
