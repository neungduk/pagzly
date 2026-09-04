# 96차 — 요소 단위 클릭 + 레퍼런스 이미지 채팅 첨부

생성: 2026-09-03

## 요약

`SectionPatchChat`에 **선택한 필드 경로(`elementPath`)** 와 **레퍼런스 이미지 첨부**를 추가했습니다. 분석은 서버의 `analyzeReferenceImage`만 호출합니다. 편집 모드에서 hero 헤드라인·카드 title/body 클릭 시 patch 탭으로 동기화됩니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `app/api/patch-section/route.ts` | `elementPath` / `referenceImageBase64` + 프롬프트 블록 |
| `components/EditableText.tsx` | `elementPath` 클릭/포커스 선택 |
| `components/DetailSectionRenderer.tsx` | `onElementSelect`, hero·cards 경로 |
| `components/SectionPatchChat.tsx` | 선택 표시, 이미지 첨부 UI |
| `components/DetailActionBar.tsx` | prop 전달 |
| `app/create/result/page.tsx` | state 연동, patch body 확장 |

## tsc

```bash
npx tsc --noEmit  # exit 0
```

## 체크리스트

- [x] patch-section Body + 프롬프트
- [x] DetailSectionRenderer onElementSelect (hero + cards 우선)
- [x] SectionPatchChat 이미지 + selectedElementPath
- [x] 서버 analyzeReferenceImage
- [x] result page 연동
- [x] tsc 0
- [ ] 실기기 스크린샷(수동)
