# 487차 보고 — 프리뷰 빌드 타입 오류 복구

## 확인하지 못한 항목
- **Vercel 프리뷰 재빌드 성공**: push 후 기획 담당 확인. 로컬 `tsc`/`npm run build`만 통과 확인.
- **run-all 완전 동일 카운트**: 이번 run-all은 25/172(기존 24 + 479 타임아웃 플레이크). 479 단독은 통과. 타입 수정과 무관.

## 오류 원인
- 함수: `lib/keyvisual-482.ts` → `calloutSourcesFromDetail482`
- 호출: `DetailSectionRenderer.tsx:6524`, `export-detail-html.ts:2322`
- 인라인 `items?: string[]` vs `FaqSection.items: {question,answer}[]`
- 최초: **`bb5e17f` (482차)** `feat(482): add local SVG/CSS keyvisual…`
- 본문은 checklist의 string items만 사용(FAQ items 미사용).

## 수정 내용
- 매개변수만 `sections: DetailSection[]`로 변경. 본문 로직·`as any`/`@ts-ignore` 없음.

## 빌드
| 명령 | 결과 |
|------|------|
| `npx tsc --noEmit` | 통과 |
| `npm run build` | 통과 (TypeScript Finished, 55 routes) |

## 회귀
- keyvisual-482·label-check 통과. run-all 기존 실패 유지(+479 타임아웃 1회).

## 변경 파일
- `lib/keyvisual-482.ts`
- `review/TASK_487.md`, `487-targets.md`, `487-notes.md`, `487cha-report.md`
- `review/CHECKLIST.md` — 차수 마무리 `tsc --noEmit` 한 줄

## Push
- branch: `cloud-work` → `origin/cloud-work` (**main 미푸시**)
- tip: (커밋 후 갱신)
- 항목: targets `ef28666` → A `4162bdf` → B `809980f` → C `90b335b` → D `1e0e4d7` → E (본 커밋)
