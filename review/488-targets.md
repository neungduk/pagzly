# 488차 목표 (코드 전)

## 성공 기준
1. **탭 메타**: `/label-check` title `화장품 표시사항 PDF 검수 | Pagzly`, description 한 줄(소개 범위), noindex/nofollow 유지. 상세 메타 미변경.
2. **찾은 내용 표시**: 조각 ≤60자, 공백/구분자 경계 절단+`…`, 공백·줄바꿈 정리, 구분은 ` · `. 통과는 "표기 확인됨"만. 상태(possible/attention/unknown/pass 집계) 불변. 샘플 JSON 재생성.
3. **회귀**: title, 조각 규칙, 통과 미노출, A/B/C 상태 집계 동일, 가로 넘침 0.
4. **빌드**: `npx tsc --noEmit`, `npm run build` 통과.

## 비목표
- 새 검사 규칙, 판정 상태 변경, 상세페이지, Production/main, 유료 호출.
