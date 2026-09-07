# 134차 — 결과 화면 "직접 편집" 영역 UI 리프레시 (기능 변경 없음)

생성: 2026-09-07
전제: 사용자가 결과 화면(`/create/result`)이 단조롭다고 피드백 → Claude(Cowork)가 디자인 캔버스로 두 방향
목업을 만들어 보여줬고, 사용자가 **A안(항목마다 부드러운 색 배지로 구분)** 을 채택. 이어서 사용자가 콕 집은
지점은 **"직접 편집"을 하는 공간(섹션 목록 / AI 채팅 수정 / 도구 아코디언)이 너무 밋밋하다**는 것 —
이번 라운드는 그 사이드바 영역만 A안 톤으로 다시 그립니다. **로직/핸들러/API 호출은 전혀 건드리지 않고
스타일(className)만 교체**하는 라운드입니다.

## 0. 색상 토큰 — 반드시 기존 것만 사용

새 색을 추가하지 마세요. 기존 Tailwind 테마 클래스만 조합합니다 (globals.css `@theme`에 이미 등록됨):

| 이름 | 클래스 예시 | 용도 |
|------|------------|------|
| ink | `text-ink`, `bg-ink` | 본문/강조 텍스트, 진한 버튼 |
| paper | `bg-paper` | 배경 |
| registration-red | `text-registration-red`, `bg-registration-red`, `bg-registration-red/10` | 주 강조색(전송 버튼, 선택 상태, 편집 아이콘) |
| slate-blue | `text-slate-blue`, `bg-slate-blue/10` | 보조 강조색(AI/자동 생성 계열) |
| mustard | `text-mustard`, `bg-mustard/15` | 보조 강조색(추천 칩, 업로드 계열) |
| line | `border-line`, `bg-line/20` | 테두리/중립 배경 |

`/10`, `/15`, `/20` 같은 투명도 접미사로 "옅은 틴트" 배경을 만드세요(디자인 캔버스의 red-soft/mustard-soft/
slate-soft에 대응). **아이콘은 이모지(👁 등) 대신 인라인 SVG**로 통일하세요(다른 컴포넌트의 CheckIcon
패턴 참고, `GenerationPipelineSummaryCard.tsx`).

## 1. `components/SectionPatchChat.tsx`

### A. 헤더 추가
현재 이 컴포넌트는 안내 문구로 바로 시작합니다. 맨 위에 헤더 블록을 추가하세요:
- 32px 원형 배지, `bg-gradient-to-br from-registration-red to-registration-red/60` (또는 유사 그라데이션),
  안에 흰색 sparkle/AI 아이콘 SVG.
- 옆에 타이틀 "AI 채팅 수정" (`text-sm font-bold text-ink`) + 부제 "섹션을 고르고 말하듯 지시하세요"
  (`text-[11px] text-ink/50`).
- 기존 안내문("섹션을 고르고 채팅처럼...")은 부제로 대체되므로 중복 시 제거해도 됩니다.

### B. 섹션 선택 — 네이티브 `<select>` 유지, 시각만 보강
`data-testid="patch-section-index"`인 `<select>`는 **그대로 네이티브 select로 유지**(접근성·기존 동작
보존 필수). 시각만: select를 감싸는 wrapper에 현재 선택된 섹션의 인덱스를 작은 원형 배지(`bg-registration-red
text-paper`, 20px, 인덱스 숫자)로 select 왼쪽에 표시하고, select 자체는 `appearance-none` +
테두리/라운드를 캔버스 목업 톤(`rounded-xl border border-line bg-paper px-3 h-10`)으로 다듬은 뒤 오른쪽에
chevron-down SVG를 절대위치로 얹으세요. 드롭다운 네이티브 동작(값 변경 시 `onPatchIndexChange` 호출)은
변경 없음.

### C. 빈 상태(메시지 없음) 개선
현재 `messages.length === 0`일 때 텍스트만 중앙 정렬로 나옵니다. 위에 36px 원형 아이콘 배지
(`bg-mustard/15 text-mustard`, sparkle 아이콘)를 추가하고, 안내 문구는 그대로 유지하되 배경을
`bg-paper` 라운드 패널(`rounded-xl`)로 감싸 카드처럼 보이게 하세요.

### D. 추천 칩(`suggestions`)
현재 `border border-line bg-paper` 플랫 핗을 `bg-mustard/15 text-mustard`(짙은 톤은
`text-[#8A5E10]` 등 mustard 계열 진한 값 — 기존 `BRAND_SOFT`/`mustard` 텍스트 대비 확인) 배경 pill로
바꾸고, 각 칩 앞에 작은 wand/sparkle 아이콘(11px)을 추가하세요. hover는 배경을 살짝 진하게.

### E. 어시스턴트 메시지 아바타
`msg.role !== "user"`인 말풍선 앞에 24px 원형 아바타(`bg-registration-red/10 text-registration-red`,
작은 sparkle 아이콘)를 추가하세요. `role === "error"`는 기존 빨간 톤 유지(아바타는 경고 아이콘으로
대체하거나 생략 — 취향껏).

### F. 입력창(composer) 재설계
현재 3개 요소(이미지 첨부 버튼 / textarea / 전송 버튼)가 개별 박스로 나열돼 있습니다. 이걸 **하나의
둥근 pill 컨테이너**(`rounded-2xl border border-line bg-paper p-2`)로 감싸고 그 안에:
- 이미지 첨부: 32px 원형 버튼(`rounded-full border border-line bg-white`), 이미지 아이콘 SVG (기존
  "이미지" 텍스트 라벨 제거, `title`/`aria-label`로 대체).
- textarea: 테두리 없이(`border-none bg-transparent`) 그대로 pill 안에서 자연스럽게.
- 전송: 32px 원형 버튼(`rounded-full bg-registration-red text-paper`), 종이비행기 아이콘 SVG (기존
  "전송" 텍스트 제거, `aria-label="전송"`).
기존 `disabled`/`onClick`/`onKeyDown`/`data-testid` 속성은 전부 그대로 유지 — 마크업 구조와 클래스만
바꾸는 작업입니다.

## 2. `components/DetailToolsAccordion.tsx`

각 아코디언 아이템에 아이콘을 붙입니다. 이 컴포넌트는 `items[].id`가 `"upload"`/`"ai"` 등
(`DetailToolTab`)이므로, id별로 아이콘/틴트 색을 매핑하는 작은 룩업을 추가하세요:
- `upload`: 업로드(위쪽 화살표) 아이콘, `bg-mustard/15 text-mustard`.
- `ai`: sparkle 아이콘, `bg-slate-blue/10 text-slate-blue`.
- 그 외 id는 `bg-line/20 text-ink/60`으로 폴백.

헤더 버튼 마크업에 26px 아이콘 배지를 라벨 왼쪽에 추가하고, 오른쪽 `{expanded ? "−" : "+"}` 텍스트를
chevron-down SVG(펼침 시 `rotate-180` 트랜지션)로 교체하세요. `expanded`일 때 헤더 배경을 해당 아이콘의
옅은 틴트로(`bg-mustard/10` 등) 바꿔도 좋습니다. `aria-expanded`, `onClick` 로직은 변경 없음.

## 3. `components/DetailStructureSidebar.tsx`

- 활성 섹션(`active` — 현재 `border-ink/30 bg-ink/5`)을 `border-registration-red/30 bg-registration-red/10`
  으로 바꾸고, 인덱스 숫자(`{index + 1}`) 앞에 4~6px 점(dot, `bg-registration-red rounded-full`)을
  추가해 "지금 이 섹션" 표시를 강화하세요. **왼쪽 border-accent 줄무늬 패턴은 쓰지 마세요** — 점 +
  배경 틴트만으로 표시.
- 숨김 토글 버튼의 `{isHidden ? "👁" : "−"}` 이모지/기호를 eye-off / eye-off-slash 인라인 SVG 쌍으로
  교체하세요. `aria-label`은 유지.

## 4. `app/create/result/page.tsx` — "직접 편집" 토글 박스 (약 1118~1141행)

현재 텍스트만 있는 `<p className="text-xs font-semibold text-ink">직접 편집</p>` 앞에 28px 원형 아이콘
배지(`bg-registration-red/10 text-registration-red`, 연필 아이콘 SVG)를 추가하세요. 버튼 2개(편집 시작/
저장)의 `onClick`/`disabled`/조건부 클래스 로직은 변경 없이, 다듬을 부분이 있다면 라운드값 정도만
(`rounded-xl` → 캔버스 톤에 맞춰 `rounded-lg`~`rounded-xl` 유지 선에서).

## 하지 않는 것

- 채팅 전송(`onSubmit`)·섹션 패치(`handlePatchSection`)·저장(`handleSave`) 등 **로직/상태/API 호출
  변경 전혀 없음** — 이번 라운드는 100% 시각(className/마크업 구조)만.
- 새 색상 값 도입 금지 — 위 §0 표에 있는 기존 토큰 조합만.
- `data-testid` 속성 삭제/변경 금지 (기존 e2e/스모크가 이 값을 참조).
- `<select>`를 커스텀 리스트박스로 완전 교체 금지 — 네이티브 select 유지(접근성).
- `PageStructureChat`, `SectionStructureEditor` 등 이번 스코프 밖 컴포넌트 변경 금지.
- 섹션 목록의 순서 변경(↑/↓) 버튼 등 기능 버튼 자체의 동작 변경 금지 — 스타일만.

## 검증

1. `TEST_MODE=true`로 아무 상품이나 생성 → 결과 화면에서 "편집 시작" 눌러 우측 패널 펼친 상태 스크린샷.
2. 섹션 하나를 골라 채팅에 추천 칩을 눌러 입력창에 텍스트가 채워지는지(기존 동작 유지) 확인 — 실제
   전송/패치 API 호출은 하지 않아도 됨(스타일 검증이 목적).
3. `DetailToolsAccordion`의 "원클릭 업로드"/"AI 자동 생성" 탭을 각각 펼쳐서 아이콘·틴트가 바뀌는지
   스크린샷.
4. `npx tsc --noEmit` 0.
5. `git diff --stat` — 변경 파일이 `components/SectionPatchChat.tsx`, `components/DetailToolsAccordion.tsx`,
   `components/DetailStructureSidebar.tsx`, `app/create/result/page.tsx` 범위 내인지 확인.
6. 기존 `data-testid` 값이 grep으로 모두 그대로 남아있는지 확인(`patch-section-index`,
   `patch-instruction`, `patch-submit`, `patch-reference-attach`, `desktop-tools-accordion`,
   `desktop-structure-sidebar` 등).

## 완료 보고 체크리스트

- [ ] SectionPatchChat: 헤더/섹션 선택 배지/빈 상태/추천 칩/아바타/입력창 pill 전부 반영
- [ ] DetailToolsAccordion: 아이콘 배지 + chevron 회전 반영
- [ ] DetailStructureSidebar: 활성 섹션 red/10 틴트 + dot, 숨김 아이콘 SVG 교체
- [ ] result/page.tsx 직접 편집 박스에 연필 아이콘 배지 추가
- [ ] 로직/핸들러/상태 변경 없음 확인 (diff로)
- [ ] 신규 색상 값 없음 확인 (기존 토큰만 사용)
- [ ] `data-testid` 전부 보존 확인
- [ ] 스크린샷 3장(편집 패널 펼침, 도구 아코디언 2탭) 첨부
- [ ] `npx tsc --noEmit` 원본 출력
- [ ] `git diff --stat` 원본 첨부
