# TASK_469 — V5 남은 평평한 덩어리 걷어내기 (요약본, 원문 지시서의 규칙·목표 동일)

시작 문장: "469차 시작: V5 남은 평평한 덩어리 — 사진 배경 정보 블록·일반 섹션 구조·본문 글자·화면 장악 장면(코딩 전용, 오래 진행)".

## A. 468차 평가
아키타입 구분은 확실히 좋아짐. 남은 평평한 곳: (1) 사진 배경 정보 블록(info-backdrop: 사진+진한 스크림+진한 카드)이 아키타입과 무관하게 짙은 덩어리, (2) target_persona 8종 동일, (3) 제품 스펙/상품 정보 표 동일, (4) 본문 글자 13~14px로 작음, (5) 화면을 장악하는 장면 없음. (정정) "큰 빈 사진 틀"은 lazy 이미지 캡처의 가짜 현상 — 468차 폴백은 유지하되 더 손대지 않음.

## B. 규칙 (468차와 동일)
금지 실행(캡처·PNG 대조·퍼징·pc-verify·launch-smoke·next build/dev·run-all 전체·Playwright·네트워크·사진 다운로드/업로드), 허용(tsc, 단독 정적 회귀, 문자열 렌더, 갤러리). 새 문구·수치 금지, 고지·결제·cta_price·data-pz-buy·스티키 바·편집 UI·인터랙션·규정 문구 불변, 폰트 추가 금지, 후기·집계·측정 근거·비교 정책 존중(충돌 시 기존 렌더러). V5 켜짐 뒤에서만, V5 꺼짐 출력(468차 끝)·V4 꺼짐(438차) diff 0, BANNER_STYLE 기본값 불변. 금지 CSS 목록·750 초과 고정 폭 금지·본문 ≥14px·대비 4.5:1·export +35% 이내. 파일은 읽은 뒤 쓰기, heredoc 금지, git add 파일명, run-all SUITES 하나씩.

## C. 단계
- Phase 0 측정 정정·목표 선기재(`docs/dynamics-audit-469.md`): 정보 백드롭 블록 식별, 보이는 진한 면 정정(백드롭 포함), 본문 글자 중앙값·줄 글자 수, 화면 장악 장면 수, 일반 섹션 후보 표. 목표: 진한 면 lightOnly·tintAlt ≤15%(최악 ≤25%)/impact 25~45/pop 30~55; 본문 중앙값 ≥15px 줄 글자 +15%; 장면 강도5 ≥3/4 ≥2/3 ≥1; 일반 섹션 "가능" 전부(최소 persona·spec/상품 정보·step); 평탄 구간 ≤37, 연속 3개 단일 ≤0.5.
- Phase 1 정보 백드롭 아키타입화(토큰 infoBackdrop: scrim-deep/scrim-light/photo-plain/solid), 대비 팔레트 전수, 연속 같은 값 금지.
- Phase 2 일반 섹션 구조 재작성(target_persona 아키타입별 구성, spec_table/상품 정보 큰 숫자 카드+2열 목록, step_card, review_highlight·checklist·highlight_box는 정책 확인 후), 인터랙션 DOM 유지, 폴백.
- Phase 3 본문 글자 토큰(15~16px, 행간 1.7~1.8, 줄 길이), 규정·고지·가격 글자 불변.
- Phase 4 화면 장악 장면(fullScene·bigStat·bigQuote), 기존 블록 승격 계획기(25~35%·55~70%·마무리 근처, 연속 금지, 사이 조용한 블록 2개).
- Phase 5 갤러리 lazy→eager 옵션(기본 켜짐, 갤러리 산출물만), pc-todo 권장 세트.
- Phase 6 안전망 `scripts/regression/dynamics-469.ts`, 문서, `review/469cha-report.md`.

## D/E. 완료 기준·하지 않는 것은 원문과 같다(빈 사진 틀 추가 수정 금지 포함).
