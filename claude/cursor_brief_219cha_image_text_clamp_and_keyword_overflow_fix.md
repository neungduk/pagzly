# 219차 Cursor 실행 브리프 — image_text 헤드라인 잘림 + 초대형 키워드 오버플로우 수정

## 배경

Claude가 `review/181cha-live/{electronics,pet,fashion}/03-result-full.png`(기존
캡처, 새로 생성한 것 아님)와 각 카테고리 `session.json`의 원문 heading/body를
직접 대조해 코드 버그 2건을 확인했습니다. 자세한 근거는
`claude/219cha-live-rebenchmark-findings.md` 참고. **이번 라운드는 유료 생성 API
호출 0건**이며, 아래 두 수정 모두 순수 코드 변경 + 유닛/Playwright 테스트로
검증 가능한 범위로 스코프를 좁혔습니다. **이 스코프를 벗어나는 어떤 파일도
건드리지 마세요.**

## 절대 제약사항 (재확인)

- `/api/generate`, Replicate, Claude, DeepSeek 등 **생성 API 호출 절대 금지**.
  이번 브리프의 모든 검증은 기존 `review/181cha-live/*/session.json` 픽스처와
  순수 함수 호출, Playwright 로컬 렌더링만으로 이뤄져야 합니다.
- `lib/detect-held-object-placement.ts`, `lib/lifestyle-product-composite.ts`
  등 사진 합성 관련 파일은 이번 브리프와 무관하므로 손대지 마세요.
- 아래 명시된 파일 외 다른 파일 수정 금지.

---

## 수정 1 — `lib/detail-visual-enhancements.ts`: `parseMegaKeywordHeading()` 오버플로우 가드

**문제**: 첫 공백 토큰을 길이(2~10자)만 검사해 초대형 키워드로 승격시키는데,
`"210g/yd"`처럼 숫자+영문+기호가 섞인 토큰은 줄바꿈 지점이 없어 카드 밖으로
흘러넘칩니다(fashion 실사례, 라이브 미리보기 + 정적 export HTML 양쪽 다 영향).

**수정 내용**: 일반 분기(현재 32~35행)에서 후보 토큰이 "숫자를 포함"하면
키워드 승격을 거부하고 원문 전체를 `remainder`로 돌려주도록 조건을 추가하세요.
숫자가 섞인 토큰은 애초에 "스펙 값"이지 "한 단어 키워드"가 아니므로, 초대형
디스플레이 대신 평범한 크기의 제목으로 렌더링되는 것이 의미상으로도 더
정확합니다.

```ts
// lib/detail-visual-enhancements.ts

export function parseMegaKeywordHeading(title: string): {
  keyword: string | null;
  remainder: string;
} {
  const trimmed = title.trim();
  if (!trimmed) return { keyword: null, remainder: "" };

  const latin = trimmed.match(/^([A-Za-z][A-Za-z0-9.&-]{0,18})/);
  if (latin) {
    return {
      keyword: latin[1].toUpperCase(),
      remainder: trimmed.slice(latin[0].length).trim(),
    };
  }

  const first = trimmed.split(/\s+/)[0] ?? "";
  // 219차: 숫자가 섞인 토큰("210g/yd", "1단당" 등)은 줄바꿈 지점이 없어
  // 초대형 keywordDisplay에서 카드 밖으로 흘러넘칠 수 있으므로 승격 제외.
  const hasDigit = /[0-9]/.test(first);
  if (first.length >= 2 && first.length <= 10 && !hasDigit) {
    return { keyword: first, remainder: trimmed.slice(first.length).trim() };
  }

  return { keyword: null, remainder: trimmed };
}
```

주의: 라틴 분기(`latin` 정규식)는 건드리지 마세요 — "AURA", "FRAME" 같은 순수
영문 브랜드명 키워드는 계속 정상 동작해야 합니다(숫자가 안 섞인 케이스라
`hasDigit` 조건과 무관).

## 수정 2 — 초대형 키워드에 방어적 `overflow-wrap` 추가 (2중 안전장치)

수정 1로 "210g/yd" 같은 케이스는 애초에 승격되지 않지만, 향후 다른 경로로
비슷한 값이 들어올 가능성에 대비해 렌더링 쪽에도 방어선을 추가합니다.

**`components/DetailSectionRenderer.tsx`** — `TYPO.keywordDisplay`
(226~227행 부근)에 `break-words` 유틸리티 클래스를 추가:

```ts
keywordDisplay:
  "break-words font-heading text-[clamp(2.25rem,11vw,4.25rem)] font-black uppercase leading-[0.92] tracking-[-0.06em]",
```

(Tailwind의 `break-words`는 `overflow-wrap: break-word`와 동일 — 이미 프로젝트에서
쓰이는 유틸리티 클래스이므로 새 CSS 정의 불필요. `word-break: keep-all`과 달리
한글 줄바꿈 동작에는 영향 없음.)

**`lib/export-detail-html.ts`** — 231행, 253행, 262행 세 곳의 `keywordClamp`/
`keywordClampCard` 인라인 style 문자열에 `overflow-wrap:break-word;` 를 추가하세요
(예: 231행 `font-size:${FONT_SIZE.keywordClamp};font-weight:900;...` 앞이나 뒤에
`overflow-wrap:break-word;` 삽입). 세 곳 모두 동일하게 적용해야 합니다 —
하나라도 빠뜨리면 정적 export에서 버그가 재현될 수 있습니다.

---

## 수정 3 — `components/DetailSectionRenderer.tsx`: `image_text` 좁은 2단 레이아웃 clamp 완화

**대상**: `case "image_text"` 내부, 1922~1936행 부근 (`pointIndex`가 있는 기본
분기 — `EDITORIAL_BLEED` 분기(1840~1863행 부근, `line-clamp-1`/`line-clamp-4`)는
**건드리지 마세요**, 별개 레이아웃입니다).

**변경 전**:
```tsx
<EditableText
  as="h3"
  ...
  className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
/>
...
<EditableText
  as="p"
  multiline
  ...
  className={`mt-4 line-clamp-5 ${TYPO.body}`}
/>
```

**변경 후**:
```tsx
<EditableText
  as="h3"
  ...
  className={`line-clamp-3 ${TYPO.sectionTitle}`}
/>
...
<EditableText
  as="p"
  multiline
  ...
  className={`mt-4 line-clamp-7 ${TYPO.body}`}
/>
```

**중요**: 이 지역 변수 `HEADLINE_CLAMP`(파일 상단 공유 상수)를 전역으로 바꾸지
마세요 — 이 상수는 파일 안에서 15곳 넘게 쓰이고 있고, 다른 섹션(hero, banner,
checklist 등)은 일부러 2줄로 짧게 자르는 게 의도된 디자인입니다. **오직 이
`image_text` 기본 분기 두 군데(헤드라인 `h3`, 본문 `p`)의 className 리터럴만
직접 바꾸세요.** 본문 `line-clamp-5`는 애초에 공유 상수가 아니라 이 위치에만
쓰이는 리터럴이므로 안전하게 그대로 바꾸면 됩니다.

**왜 3/7인가**: 실제 세션 데이터(electronics `design_detail`: 헤드라인 7자
"방 안에 놓이는 디자인", 본문 2문장 약 85자 / pet `packaging_design`: 헤드라인
8자 "2kg 한 봉 포장")가 40% 텍스트 컬럼 폭에서 각각 3줄, 7줄 이내로 들어가는지
아래 검증 단계에서 Playwright로 실측해 확정하세요. 만약 3/7로도 실측 결과 두
예시 중 하나라도 여전히 잘린다면, 잘리지 않을 때까지 값을 한 단계씩 올리고
(예: 4/8), **최종 적용값과 실측 로그를 보고서에 그대로 남기세요**(218차처럼
1차 실패 → 재조정 서사를 숨기지 말고 보고).

---

## 검증 (유료 API 0건 — 필수)

### A. `parseMegaKeywordHeading` 유닛 테스트 (신규: `scripts/219cha-keyword-guard-verify.ts`)

`npx tsx scripts/219cha-keyword-guard-verify.ts`로 실행 가능하게, 기존
`scripts/211cha-lifestyle-matching-verify.ts`와 같은 `assert()` 패턴으로 작성:

- `parseMegaKeywordHeading("210g/yd")` → `keyword === null`,
  `remainder === "210g/yd"` (수정 1이 숫자 포함 토큰을 거부하는지 회귀 테스트)
- `parseMegaKeywordHeading("코튼 100%")` → `keyword === "코튼"`,
  `remainder === "100%"` (기존 정상 케이스가 안 깨지는지 회귀 테스트 — fashion
  실사례)
- `parseMegaKeywordHeading("수축 2%↓")` → `keyword === "수축"` (기존 정상 케이스)
- `parseMegaKeywordHeading("AURA LAB")` → `keyword === "AURA"` (라틴 분기 회귀 —
  beauty 실사례 브랜드명, `hasDigit` 조건이 라틴 분기엔 영향 없어야 함)
- `parseMegaKeywordHeading("단당 80kg")` → `keyword === "단당"` (이번 라운드
  스코프 밖인 카피 품질 이슈이므로 **일부러 안 건드림** — 렌더링이 여전히
  "단당"을 키워드로 승격시키는 게 맞는 동작임을 회귀 테스트로 고정해 두면,
  다음 라운드에서 실수로 건드릴 때 바로 알아챌 수 있음)

### B. `image_text` clamp — Playwright 실측 (신규 또는 기존 QA 스크립트 확장)

기존 `scripts/181cha-live-generate.ts`가 쓰는 것과 동일한 방식(Playwright,
`dev` 서버, 1280×900 데스크톱 뷰포트)으로 `/create/result` 페이지에
`review/181cha-live/electronics/session.json`과
`review/181cha-live/pet/session.json`을 그대로 로드해(새로 생성하지 말고
**기존 세션 JSON을 그대로 재사용**), 에디터의 모바일 미리보기 프레임에서:

1. electronics의 `design_detail` 섹션(heading "방 안에 놓이는 디자인")과
   pet의 `packaging_design` 섹션(heading "2kg 한 봉 포장")을 스크롤해 찾고,
2. 해당 `h3`/`p` 엘리먼트의 `scrollHeight`와 `clientHeight`를 `page.evaluate()`로
   읽어 `scrollHeight <= clientHeight + 2`(오차 허용 2px)를 assert — 즉
   **CSS clamp로 인한 시각적 잘림이 실제로 사라졌는지 DOM 레벨에서 증명**하세요.
   (className 문자열이 `line-clamp-3`으로 바뀐 것을 grep으로 확인하는 것만으론
   불충분합니다 — line-clamp-3이어도 텍스트가 여전히 3줄을 넘으면 잘립니다.
   반드시 실제 렌더링 후 overflow 여부를 측정하세요.)
3. 수정 전 상태(git stash 또는 브랜치 비교)에서 같은 측정을 돌려 **수정 전엔
   overflow가 있었고 수정 후엔 없어졌다**는 before/after 대비를 로그로 남기세요.
4. 회귀 확인: 일부러 아주 긴 더미 heading(예: 40자)을 주입해 여전히 어느 지점에서는
   clamp가 걸려 레이아웃이 무한정 늘어나지 않는지도 확인(완전히 안전장치를
   없앤 게 아니라 임계값만 올렸다는 것을 증명).

### C. 기존 회귀 테스트 전체 재실행

`scripts/211cha-lifestyle-matching-verify.ts`, `scripts/218cha-matching-intensity-verify.ts`
등 기존 유닛 테스트가 이번 변경과 무관하게 전부 pass하는지 재실행하고 로그를
보고서에 남기세요(이번 변경이 `photo-composite.ts`/`lifestyle-*.ts`를 건드리지
않으므로 통과해야 정상).

---

## 보고 형식

`review/219cha-report.md`에 다음을 포함해 작성해 주세요:

1. 세 군데 코드 변경의 diff (또는 `git diff` 원문)
2. 검증 A(유닛 테스트) 전체 로그 — pass/fail
3. 검증 B(Playwright 실측)의 before/after `scrollHeight`/`clientHeight` 수치
   — 어느 clamp 값(3/7 그대로인지, 조정했는지)으로 최종 통과했는지 명시
4. 검증 C(기존 회귀) 로그
5. "API generate: 0" 명시적 확인 문구

완료되면 `보고: review/219cha-report.md`로 알려주세요.
