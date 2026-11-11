# 519차 보고서 — 랜딩 첫 화면 재구성

## 확인하지 못한 항목
- 브라우저에서 1440×900 스크롤 없이 무대 280px 노출 여부 실측하지 않음(CSS·구도로만 맞춤).
- 360px·390px 모바일에서 태그 가로 스크롤 여부를 실기기로 보지 않음(CSS로 태그 폭·위치 제한).
- 연출 8초 루프·태그 상대 위치의 시각 품질은 정적·회귀만 확인.

## 커밋 (cloud-work, main 미푸시)
1. `61e360c` — LandingStage519·CSS·CountUp·데모 상수
2. `a3ec033` — 띠 분리·랜딩 연결
3. `2c0722b` — 519 회귀·514/515/517 경로 갱신
4. `2288328` — 보고서 + ui-511 Stage·Belt re-export

## 한 일
- `ui-519/LandingStage519.tsx` + `landing-519.css`: Harvey식 2단 제목 줄 + 넓은 무대(번짐 판·라벨 종이·검은 결과 카드·DeepL식 태그).
- 제목 `{kr}개 기준`은 `labelRuleCounts514().kr` + `CountUp514`(reduced-motion 즉시 최종값).
- `LandingBelt515`로 예시 문구 띠 분리. `LabelCheckLanding511`에서 옛 `lc514-hero`+전체 ProofDemo 자리를 Stage+Belt로 교체.
- `LandingProofDemo511`은 띠 re-export만 유지(파일 삭제 없음).
- 데모 문구 `_519` 상수는 `landing-demo-514.ts`에 추가.

## 안 쓰게 된 클래스(삭제하지 않음)
- `lc514-hero`, `lc514-hero-sub`, `lc514-hero-btns`, `lc514-hero-hints` (랜딩 첫 화면에서 미사용)
- `lc515-float1`, `lc515-float2` (새 태그와 역할 겹침 → 무대에서 미사용)
- `lc514-demo` / `lc514-demo-grid` 구 데모 그리드(랜딩 경로)

## 회귀 테스트 수정
- **514/515/517**: 첫 화면이 `ui-519`로 옮겨져 `LandingProofDemo.tsx`만 보면 “예시 화면입니다”·칩 카운트·`lc517-land-hero`가 빠지는 것처럼 보임 → Stage/Belt/데이터 파일을 함께 보도록 검사 경로를 새 구조에 맞게 고침(구도 변경이 원인).
- **519** 신규: 금지어·`labelRuleCounts514`·reduced-motion·법적 고지·`id=demo` 1곳·랜딩 연결.

## 검증
- `npx tsc --noEmit` 통과
- `npm run regression:label-check` 31/31 통과
