# 245차 — `generate-beauty-showcase-one.ts` 실패 원인 확정·수정 (스크립트 1줄, 유료 재실행은 사용자 재허가 후)

생성: 2026-09-23 · 유료 API **이번 라운드에선 0건** (원인 진단·스크립트 수정까지만, 재실행은 별도 허가 대기)

## 한줄 결론

`/create`가 더 이상 폼 페이지가 아니라 "무엇을 만드시겠어요?" 선택 페이지(`app/create/page.tsx`,
`<select>` 0개)로 바뀌었고, 실제 상세페이지 폼(`CreateProductForm`)은 `/create/detail`로
이동함. 244차 실패는 스크립트가 옛 URL(`/create`)을 쓰고 있었기 때문 — 코드 결함 없음, UI
변경에 스크립트가 안 따라간 것뿐.

---

## 1. 근거 (코드로 확인 완료)

- `app/create/page.tsx` — 폼이 없음. "상세페이지"(`/create/detail` 링크)·"인스타 피드·
  블로그/티스토리"(`/create/social` 링크) 2개 카드만 있는 선택 페이지. `<select>` 0개 —
  Playwright의 `locator('select').first()`가 480초 내내 못 찾은 게 정상 동작.
- `app/create/detail/page.tsx` — `<CreateProductForm userId={user.id} />`를 렌더. 실제 폼은
  여기 있음.
- `components/CreateProductForm.tsx`(현재 mtime 확인 — 244차가 참조한 것과 같은 최신 버전)
  — 카테고리 `<select>`(802행)·`#productName`(951)·`#brandName`(984)·`#price`(1001)·
  `#targetCustomer`(1018)·`#keyFeatures`(1058)·`#ingredients`(1126)·`#certifications`
  (1140)·`#wholesaleUrl`(1604) 전부 스크립트가 쓰는 셀렉터 그대로 존재 — 필드 자체는
  안 바뀜, 진입 경로만 바뀜.
- 제출 후 라우팅(`router.push("/create/draft")`, 728행)·`data-testid="detail-preview"`
  (`app/create/result/page.tsx:886`)·`data-testid="backdrop-picker"`/`backdrop-candidate-${index}`/
  `backdrop-confirm`(`components/BackdropCandidatePicker.tsx`) 전부 스크립트 기대값과 일치
  — 폼 진입 URL 하나만 고치면 나머지는 그대로 작동할 것으로 판단.

## 2. 수정 (스크립트 1줄, 유료 API 무관)

`scripts/generate-beauty-showcase-one.ts` 148행:

```diff
-  await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
+  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
```

이 한 줄 외 다른 수정 불필요 — 나머지 셀렉터·라우팅·testid는 위 §1에서 전부 현재 코드와
호환 확인됨.

## 3. 이번 라운드 범위 — 스크립트 수정까지만, 실행은 별도 허가

**이 수정 자체는 유료 API 호출이 전혀 없음(스크립트 파일 1줄 편집뿐)이라 바로 적용해도 됨.**
다만 수정한 스크립트를 실제로 돌려 화장품 실사 1건을 생성하는 것은 244차와 동일하게
**프로덕션 생성 파이프라인(유료)을 태우는 행위** — Claude가 사용자에게 재확인 후 다음
브리프(246차 또는 244차 재실행 승인)로 정확한 횟수를 다시 명시할 예정. **이 브리프
단계에서 Cursor는 스크립트 수정만 하고, 사용자의 명시적 재허가 없이 스스로
`npx tsx scripts/generate-beauty-showcase-one.ts`를 실행하지 말 것.**

## 4. 검증 (유료 API 불필요)

- 수정 후 `npx tsx --check scripts/generate-beauty-showcase-one.ts`(또는 esbuild 구문 검증)로
  문법 오류 없는지 확인.
- diff가 위 1줄뿐인지 확인(다른 로직 손대지 않았는지).
- `review/245cha-report.md`에 diff·구문 검증 결과만 기록 — API generate: 0.
