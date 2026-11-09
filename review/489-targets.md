# 489차 목표 (코드 전)

## 성공 기준
1. **플래그**: `DETAIL_PAGE_ENABLED` = `NEXT_PUBLIC_DETAIL_PAGE_ENABLED === "1"`만 켜짐(기본 꺼짐). 서버·클라이언트 공용 헬퍼 1개. 코드 삭제 없음.
2. **UI 꺼짐**: 랜딩은 검수 소개(한 줄+3줄 재사용) + "PDF 검수 시작"→`/label-check`. 상세 홍보·`/create` 진입점 0. `/create`·`/onboarding` → `/label-check`. 메타·OG는 "Pagzly · 화장품 표시사항 PDF 검수". sitemap에 `/label-check`·create 미포함.
3. **API 꺼짐**: 유료 생성 계열은 라우트 최상단에서 404/503 JSON 거절(외부 호출 0). 예외·근거는 `489-notes.md` 표.
4. **켜짐(`1`)**: 기존과 동일(링크·API 통과).
5. **회귀**: `feature-flag-489` + label-check 불변 + 기존 상세 실패 목록 불변 + 가로넘침 0. `tsc`/`build` 통과.

## 비목표
- 코드 삭제, main/Production, 유료 호출, 검수 규칙 변경, `/label-check` 공개(sitemap·index).
