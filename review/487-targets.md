# 487차 목표 (코드 전)

## 성공 기준
1. **원인**: `DetailSectionRenderer`/`export-detail-html` 호출 함수의 인라인 타입 vs `FaqSection.items` 충돌을 notes에 기록. `git log -S`로 최초 도입 커밋·차수 기록. items 실제 사용 방식 확인.
2. **최소 수정**: 매개변수 타입만 실제 유니온에 맞게 확장. 본문 로직·`as any`/`@ts-ignore` 금지. 본문 오류 나면 멈추고 notes 보고.
3. **빌드 게이트**: `npx tsc --noEmit` + `npm run build` 둘 다 통과. 추가 타입 오류는 같은 원칙으로 정리·보고. 이후 체크리스트에 tsc 한 줄.
4. **회귀**: 상세 export 바이트 동일, label-check 통과, run-all 실패 24건 변동 없음.
5. **비목표**: 동작 변경, label-check 변경, Production/main, 유료 호출.
