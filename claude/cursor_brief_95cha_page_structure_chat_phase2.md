# 95차 — 채팅형 페이지 편집 Phase 2: 전체 구성 AI 채팅(순서·표시 지시)

생성: 2026-09-03
근거: `review/upgrade-proposals.md` P1-7("채팅형 편집 Phase 2 — 전체 페이지 단위 채팅, 섹션 추가·순서 변경 지시", 크리에이지 벤치마크). 전제: **슬롯 신설·새 섹션 타입 추가는 이번 라운드에서 하지 않습니다** — 이미 화면에 존재하는 섹션들의 순서 변경과 표시/숨김만 채팅으로 지시할 수 있게 합니다("섹션 추가"는 이미 생성된 섹션 중 숨겨진 걸 다시 보이게 하는 것까지만 지원, 완전히 새로운 섹션 타입 생성은 범위 밖).

## 배경

지금 `SectionPatchChat`(`components/SectionPatchChat.tsx` + `POST /api/patch-section`)은 **선택한 섹션 1개의 카피만** 같은 구조로 고칩니다. `app/api/patch-section/route.ts`의 DeepSeek 프롬프트는 "구조(키)를 바꾸거나 새 필드를 추가하지 마세요"라고 명시되어 있어 순서 변경이나 표시/숨김에는 못 씁니다. 반면 `SectionStructureEditor`/`DetailStructureSidebar`는 ↑↓ 버튼과 숨김 토글로 순서·표시를 바꿀 수 있지만 **버튼 클릭으로만** 가능하고 AI 채팅 지시가 없습니다.

이번 라운드는 "리뷰 섹션을 히어로 바로 다음으로 옮겨줘", "비교표 섹션 숨겨줘", "GIF 섹션 다시 보여줘" 같은 자연어 지시를 받아서 **기존 `onReorder`/`onToggleHidden` 콜백을 그대로 호출**하는 AI 해석 레이어를 추가합니다. 섹션 JSON 내용 자체(카피)는 건드리지 않습니다 — 그건 기존 `SectionPatchChat`의 역할로 남겨둡니다.

## 작업 A — 신규 API `POST /api/patch-page`

새 파일 `app/api/patch-page/route.ts`. `app/api/patch-section/route.ts`와 같은 인증(`createClient` + `auth.getUser()`)·에러 처리 패턴을 따르세요.

```ts
type Body = {
  sections: DetailSection[];
  hiddenIndexes: number[];
  instruction: string;
};

type PageAction =
  | { type: "reorder"; from: number; to: number }
  | { type: "toggleHidden"; index: number };

type PageActionPlan = {
  actions: PageAction[];
  /** 지시를 이해했지만 이번 기능 범위 밖일 때 사용자에게 보여줄 안내 */
  unsupportedNote?: string;
};
```

DeepSeek 프롬프트(기존 `patch-section`과 동일하게 `response_format: json_object`, `DEEPSEEK_MODEL`)에 현재 섹션 목록을 `index: type/slot/label` 형태로 나열해서 주고, 사용자 지시를 `actions` 배열(reorder/toggleHidden)로만 반환하게 하세요:

```
아래는 현재 상세페이지의 섹션 순서입니다 (index는 0부터 시작):
0: hero (헤드라인: "...")
1: checklist (slot: benefits)
2: review_highlight (slot: review_highlight, 현재 숨김)
...

사용자 지시: "${instruction}"

이 지시를 아래 두 종류의 action으로만 표현해서 JSON으로 반환하세요:
- {"type":"reorder","from":<현재 index>,"to":<옮길 index>}
- {"type":"toggleHidden","index":<index>}

새로운 섹션을 만들거나, 섹션을 완전히 삭제하거나, 섹션 내용을 고치는 지시는 이 기능으로 처리할 수 없습니다.
그런 지시라면 actions는 빈 배열로 두고 unsupportedNote에 사용자에게 보여줄 짧은 안내 문장을 한국어로 쓰세요
(예: "죄송해요, 새 섹션 추가는 아직 지원하지 않아요. 섹션 순서 변경이나 숨기기만 가능해요.").

{"actions": [...], "unsupportedNote": "..." | null}
```

**서버에서 반드시 검증**(DeepSeek 응답을 그대로 믿지 않음):
- `actions.length <= 10` — 초과하면 잘라냄.
- 모든 `from`/`to`/`index`가 `0 <= n < sections.length` 범위인지 확인, 벗어나면 해당 action은 버리고 나머지만 적용.
- `reorder`에서 `from === to`인 항목은 제거(무의미).

응답: `return NextResponse.json({ actions: validatedActions, unsupportedNote: plan.unsupportedNote ?? null });`

## 작업 B — 신규 컴포넌트 `components/PageStructureChat.tsx`

`SectionPatchChat.tsx`와 톤을 맞춘 채팅 UI(같은 디자인 토큰: `border-line`, `bg-registration-red` 버튼 등, `PatchChatMessage` 타입 재사용 가능). Props:

```ts
type PageStructureChatProps = {
  sections: DetailSection[];
  hiddenIndexes: number[];
  onReorder: (from: number, to: number) => void;
  onToggleHidden: (index: number) => void;
};
```

내부에서 `instruction` textarea + 전송 버튼 + 메시지 리스트(사용자 지시 / AI 응답 요약 / 에러)를 갖는 작은 채팅. 전송 시:

1. `POST /api/patch-page`에 `{ sections, hiddenIndexes, instruction }` 전송.
2. 응답의 `actions`를 순서대로 `onReorder`/`onToggleHidden` 콜백으로 즉시(낙관적) 적용. 여러 action이 섞여 있어도 복잡한 인덱스 재계산 로직을 새로 만들 필요는 없습니다 — actions 배열을 온 순서 그대로 적용하고, 채팅 메시지에는 "N개 변경 적용됨"처럼 개수 기반 요약만 표시하세요(대부분의 실제 지시는 action 1~2개로 충분합니다).
3. `unsupportedNote`가 있으면 채팅에 AI 메시지로 그대로 표시(에러 아님, 안내).
4. 성공 시 "○○ 섹션을 옮겼어요" / "○○ 섹션을 숨겼어요" 같은 요약을 actions 개수·타입 기반으로 클라이언트에서 생성해 AI 메시지로 표시(별도 AI 호출 불필요).

## 작업 C — 통합 위치

`app/create/result/page.tsx`에서 `<SectionStructureEditor` 와 `<DetailStructureSidebar`가 렌더링되는 지점을 grep으로 찾아, 그 컴포넌트들에 이미 전달 중인 `sections`/`hiddenIndexes`/`onReorder`/`onToggleHidden` prop을 그대로 `<PageStructureChat>`에도 넘겨서 같은 블록 안(데스크톱 사이드바 하단, 모바일 구조 탭 하단)에 추가로 배치하세요. `SectionStructureEditor`의 "섹션 AI 패치"(카피 수정, 그대로 유지) 아래, "자유 캔버스 추가" 버튼 위에 넣으면 자연스럽습니다. `DetailStructureSidebar`에는 현재 patch 채팅이 없으므로 동일하게 하단에 새로 추가하세요.

## 하지 않는 것

- 새 섹션 타입 생성, 슬롯 신설, `CATEGORY_SLOT_TEMPLATES` 순서 개편 — `upgrade-proposals.md` "명시적 비목표"에 있는 항목 그대로 유지.
- 섹션 삭제(완전 제거) — 숨김(`toggleHidden`)까지만.
- 섹션 카피 내용 수정 — 기존 `SectionPatchChat`/`patch-section` API 영역, 이번 API는 건드리지 않음.
- 요소(element) 단위 편집, 레퍼런스 이미지 첨부 — 96차(Phase 3) 범위.

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- "리뷰 섹션을 맨 위로 옮겨줘" 같은 지시로 실제 순서가 바뀌는지 확인.
- "비교표 섹션 숨겨줘" → "다시 보여줘" 왕복 확인.
- "새 섹션 추가해줘" 같은 범위 밖 지시에 `unsupportedNote` 안내가 뜨고 아무 것도 깨지지 않는지 확인.
- 잘못된 index를 DeepSeek이 반환하는 경우를 가정해 서버 검증이 걸러내는지(코드 리뷰로 경계값 확인).
- 데스크톱/모바일 스크린샷.

## 완료 보고 체크리스트

- [ ] `app/api/patch-page/route.ts` 신규 + 서버 측 인덱스/개수 검증
- [ ] `components/PageStructureChat.tsx` 신규
- [ ] `app/create/result/page.tsx`에 데스크톱/모바일 양쪽 통합
- [ ] reorder/toggleHidden 왕복 동작 확인
- [ ] 범위 밖 지시 unsupportedNote 처리 확인
- [ ] `npx tsc --noEmit` 에러 0건
