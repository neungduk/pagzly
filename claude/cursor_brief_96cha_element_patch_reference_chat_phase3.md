# 96차 — 채팅형 편집 Phase 3: 요소 단위 클릭 + 레퍼런스 이미지 채팅 첨부

생성: 2026-09-03
근거: `review/upgrade-proposals.md` P1-8("요소 단위 클릭 + 레퍼런스 이미지 채팅 첨부", `lib/reference-analysis.ts` 연동). 전제: 95차(Phase 2, 페이지 단위 순서/표시 채팅)가 먼저 적용되어 있으면 좋지만, 이번 라운드는 95차와 독립적으로도 작업 가능합니다(다른 파일 영역).

## 배경

지금 `SectionPatchChat`은 **섹션 하나 전체**를 대상으로만 지시를 받습니다(예: "헤드라인을 더 짧게" 지시해도 실제로는 섹션 JSON 전체가 DeepSeek에 다시 들어가 전체가 재작성될 수 있음). 이번 라운드는 두 가지를 추가합니다:

1. **요소 단위 타겟팅**: 사용자가 섹션 안의 특정 필드(예: 헤드라인 텍스트, 카드 3개 중 2번째 카드 본문)를 클릭하면, 그 필드의 경로를 patch 지시에 함께 실어서 "그 필드만 최대한 건드리고 나머지는 그대로 두라"고 프롬프트에 명시합니다.
2. **레퍼런스 이미지 첨부**: 채팅에 이미지를 첨부하면 기존 `lib/reference-analysis.ts`의 `analyzeReferenceImage()`로 색상/무드를 뽑아서 지시문에 함께 실어 보냅니다("이 이미지처럼 카피/톤을 맞춰줘" 같은 지시에 사용).

두 기능 모두 **기존 `patch-section` API의 "같은 type/slot 구조 유지" 원칙은 그대로 유지**합니다 — 구조를 바꾸는 게 아니라, DeepSeek에게 주는 컨텍스트(어느 필드를 우선할지, 어떤 무드를 참고할지)를 더 정밀하게 만드는 것입니다.

## 작업 A — 요소 타겟팅: `elementPath` 추가

`app/api/patch-section/route.ts`의 `Body` 타입에 필드 추가:

```ts
type Body = {
  section: DetailSection;
  instruction: string;
  category?: string;
  productName?: string;
  /** 96차 — 사용자가 클릭한 필드의 경로 (예: "headline", "cards[1].body") */
  elementPath?: string;
  /** 96차 — 첨부한 레퍼런스 이미지 분석 결과 (색상/무드) */
  referenceAnalysis?: { colorHex: string[]; moodKeywords: string[] };
};
```

프롬프트 조립부에 조건부 블록 추가:

```ts
const elementBlock = body.elementPath
  ? `\n## 타겟 필드\n사용자가 화면에서 "${body.elementPath}" 필드를 클릭하고 지시했습니다. 이 필드를 우선 수정하고, 다른 필드는 지시와 명백히 관련된 경우가 아니면 원문 그대로 유지하세요.\n`
  : "";

const referenceBlock = body.referenceAnalysis
  ? `\n${formatReferencePromptBlock(body.referenceAnalysis)}\n`
  : "";
```

`formatReferencePromptBlock`은 `lib/reference-analysis.ts`에 이미 있는 함수를 그대로 import해서 재사용하세요(새로 만들지 마세요). 최종 `prompt` 문자열 조립 시 `## 지시` 섹션 근처에 `elementBlock`과 `referenceBlock`을 이어붙이면 됩니다.

## 작업 B — `DetailSectionRenderer.tsx`에 요소 클릭 → elementPath 산출

`components/DetailSectionRenderer.tsx`는 파일이 매우 크므로(2,700줄+), 전체를 다시 설계하지 말고 **이미 있는 편집 모드 표시 패턴**(`EditableText` 등 `enabled` prop으로 편집 UI를 토글하는 기존 관례)을 그대로 따르세요. 편집 모드에서 각 텍스트 필드(헤드라인, 카드 본문, 스텝 설명 등)를 감싸는 wrapper에 `onClick` 핸들러를 추가해서, 클릭 시 상위(페이지)로 `elementPath` 문자열을 알려주는 콜백을 호출합니다:

```ts
onElementSelect?: (sectionIndex: number, elementPath: string) => void;
```

`elementPath`는 필드 접근 경로를 문자열로 단순 표기(예: 헤드라인이면 `"headline"`, `cards` 배열의 n번째 `body`면 `"cards[${n}].body"`). 정확한 JS 접근 경로일 필요는 없습니다 — DeepSeek 프롬프트에 사람이 읽는 힌트로만 들어가고, 서버가 그 경로로 실제 파싱을 하지는 않기 때문입니다(구조 파싱은 여전히 기존 patch-section이 섹션 전체 JSON을 다시 받는 방식 그대로).

모든 필드에 다 걸 필요는 없습니다 — 우선 헤드라인류(`hero.headline`, `*.heading`)와 반복 배열의 텍스트(카드/스텝/체크리스트 항목)만 우선 적용하고, 표(spec_table)나 이미지 alt 텍스트 등 세밀한 것까지는 이번 라운드에서 커버하지 않아도 됩니다.

## 작업 C — `SectionPatchChat.tsx`에 이미지 첨부 UI

- `<textarea>` 옆에 이미지 첨부 버튼(파일 input, `accept="image/*"`) 추가.
- 첨부하면 클라이언트에서 미리보기 썸네일 하나 표시 + "제거" 버튼.
- 전송 시 이미지를 base64(또는 `FormData`)로 `/api/patch-section`에 함께 보내되, **분석(`analyzeReferenceImage`)은 서버(`patch-section` route)에서 수행**하세요 — Anthropic API 키가 서버 전용이라 클라이언트에서 직접 호출하면 안 됩니다. `patch-section/route.ts`에서 이미지가 오면 `analyzeReferenceImage(buffer, mediaType)`를 호출해 `referenceAnalysis`를 만들고, 작업 A의 `referenceBlock`에 사용하세요.
- 첨부 이미지는 저장하지 않습니다(1회성 분석 후 버림) — Supabase Storage 업로드 없음, 응답에도 이미지 자체는 돌려주지 않습니다.
- `elementPath`도 같은 요청에 함께 실어 보내도록 `SectionPatchChat`이 부모로부터 `selectedElementPath?: string` prop을 받아 전송 body에 포함하게 하세요.

## 작업 D — 부모 컴포넌트 연동

`app/create/result/page.tsx`에서 `DetailSectionRenderer`가 `onElementSelect` 콜백을 받도록 연결하고, 선택된 `{ sectionIndex, elementPath }`를 state로 들고 있다가 `SectionPatchChat`에 `selectedElementPath`로 내려주세요. 요소를 클릭하면 자동으로 `patchIndex`도 해당 `sectionIndex`로 맞춰서(`onPatchIndexChange` 호출) 사용자가 섹션을 다시 고를 필요 없게 하세요.

## 하지 않는 것

- `elementPath`를 서버가 실제로 파싱해서 그 필드만 부분 patch하는 정밀 로직은 만들지 않습니다 — 여전히 섹션 전체 JSON을 DeepSeek에 보내고, `elementPath`는 프롬프트 힌트로만 사용합니다(대부분의 케이스에서 충분).
- 레퍼런스 이미지를 Storage에 저장하거나 재사용 가능하게 만들지 않습니다(1회성).
- 표/사이즈 다이어그램 등 복잡한 하위 요소까지 클릭 타겟팅 완전 커버 없음 — 텍스트 위주.
- 95차(페이지 단위 순서 채팅)와의 UI 통합(같은 채팅창에 합치기)은 하지 않습니다 — 별개 패널로 유지.

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- 카드형 섹션에서 특정 카드 본문 클릭 → `SectionPatchChat`에 "선택됨: cards[1].body" 같은 표시가 뜨는지, 그 상태로 지시 시 다른 카드는 그대로인지 확인.
- 이미지 1장 첨부 후 "이 느낌으로 톤 맞춰줘" 지시 → 결과 카피 톤이 반영되는지, `analyzeReferenceImage` 서버 로그(cost) 확인.
- 이미지 없이 기존처럼 사용해도 회귀 없는지(하위 호환) 확인.
- 데스크톱/모바일 스크린샷.

## 완료 보고 체크리스트

- [ ] `patch-section` Body에 `elementPath`/`referenceAnalysis` 추가 + 프롬프트 반영
- [ ] `DetailSectionRenderer`에 편집 모드 요소 클릭 → `onElementSelect` 콜백
- [ ] `SectionPatchChat` 이미지 첨부 UI + `selectedElementPath` 표시
- [ ] 서버에서 `analyzeReferenceImage` 호출(클라이언트에서 직접 호출 없음 확인)
- [ ] `app/create/result/page.tsx` 연동(클릭 → patchIndex/elementPath 동기화)
- [ ] `npx tsc --noEmit` 에러 0건
