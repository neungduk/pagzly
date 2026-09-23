# 221차 지시서 — `image_text` 헤드라인 가로 오버플로우 수정 (코드 1줄, API 0)

## 배경

220차 검증(`review/220cha-headline-check/electronics-long-dummy.png`)에서 발견된 문제입니다.
`image_text` 섹션(`DetailSectionRenderer.tsx` `case "image_text"`)의 헤드라인(`<h3>`)에
공백 없는 매우 긴 문자열(예: 40자 이상 더미 테스트 문구)이 들어가면, line-clamp으로
"···" 처리되는 대신 **텍스트가 줄바꿈되지 않고 카드 오른쪽 경계를 뚫고 뷰포트 밖으로
흘러넘칩니다.**

원인: 219차가 같은 문제(공백 없는 긴 토큰의 오버플로우)를 `TYPO.keywordDisplay`
(`break-words` 추가)와 `export-detail-html.ts`(`overflow-wrap:break-word` 추가) 두 곳에
이미 고쳤지만, `image_text` 분기의 `<h3>` className에는 같은 처리가 빠져 있었습니다.
`line-clamp-N`(`-webkit-box` + `-webkit-line-clamp`)은 줄바꿈 지점(공백 등)이 있어야
여러 줄로 접히고, 줄바꿈 지점이 없는 긴 문자열은 `overflow-wrap`/`word-break` 없이는
그냥 컨테이너 밖으로 흘러넘칩니다.

**중요**: 실제 생성된 헤드라인(예: "방 안에 놓이는 디자인", "2kg 한 봉 포장")은 전부
공백으로 구분된 자연어 문구라 이 문제가 재현되지 않았습니다(220차 확인 완료, §1).
이번 수정은 향후 DeepSeek가 어쩌다 공백 없는 긴 문자열(코드/모델명/해시태그성 문구 등)을
생성하는 극단적인 경우에 대비한 안전장치입니다.

## 요청 사항

`components/DetailSectionRenderer.tsx`의 `image_text` 분기(`case "image_text"`)에서
헤드라인 `<h3>`(`EditableText as="h3"`)의 className에 `break-words`를 추가해주세요.

현재 (219차 기준):
```tsx
className={`line-clamp-5 pagzly-display-headline font-heading text-[2rem] font-bold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[2.75rem]`}
```

변경 후:
```tsx
className={`break-words line-clamp-5 pagzly-display-headline font-heading text-[2rem] font-bold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[2.75rem]`}
```

- **이 한 줄만** 변경합니다. `line-clamp-5`·`pagzly-display-headline` 등 219차가 확정한
  다른 값은 그대로 둡니다.
- 같은 분기의 본문(`<p>`, `line-clamp-7 ${TYPO.body}`)도 혹시 같은 위험이 있는지 확인해
  필요하면 `break-words`를 동일하게 추가해주세요(TYPO.body 자체에 이미 포함돼 있을 수
  있으니 먼저 확인 — 중복 추가 불필요).
- `export-detail-html.ts`의 image_text 관련 인라인 스타일도 혹시 헤드라인에
  `overflow-wrap:break-word`가 빠진 곳이 있는지 확인해주세요(219차가 3곳은 이미
  처리했지만 image_text 분기 자체를 놓쳤을 수 있음).

## 검증 방법 (코드 변경 없음, API 0)

220차가 썼던 40자 무공백 더미 헤드라인 주입 테스트를 재사용해, 수정 후에는 더미
헤드라인도 카드 경계를 벗어나지 않고 line-clamp으로 "···" 처리되는지 스크린샷
1장으로 확인해주세요 — `review/221cha-headline-check/electronics-long-dummy-after.png`.
electronics/pet 실제 헤드라인 2건도 회귀 없는지 스크린샷 재확인(선택, 여유 있으면).

## 완료 기준

- `break-words` 1줄 추가 (+ 필요시 export-detail-html.ts 대응 지점).
- 더미 헤드라인이 더 이상 뷰포트를 벗어나지 않음을 스크린샷으로 확인.
- `tsc` 0, API 호출 0.
- `review/221cha-report.md`에 변경 파일·라인과 스크린샷 경로 기록.
