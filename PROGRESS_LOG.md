# Pagzly 자동 작업 로그

## 전체 요약 (2026-08-16 무감독 런)

**완료**
- `/create/result`·`/dev/detail-preview` 수정 도구를 **직접 편집 / 원클릭 업로드 / AI 자동 생성 3탭**으로 고정 노출. 스크롤해도 보이도록 sticky.
- 직접 편집: 히어로·체크리스트·POINT·사용법·주의·스펙 표 인라인 수정, 저장 토스트, 실패 시 에러 토스트.
- 원클릭 업로드: JPG/PNG·8MB 가드, 미리보기 즉시 반영, 모바일에서도 보이는 "이미지 교체" 뱃지.
- AI 자동 생성: 빈 textarea면 fetch 없이 안내. Playwright에서 가드 확인.
- 랜딩: 스크롤 fade/slide, 파이프라인 카드 미세 플로트, 카드 호버. 새 색/장식 없음. `prefers-reduced-motion` 존중.
- 상세 히어로: 기존 사진에 ken-burns만. 다운로드를 가리지 않으려고 상세에는 opacity reveal 미적용.
- 레퍼런스 연습 6사이클 후 조기 종료 (quality-log.md). 이미지 재생성·QA API 없음.

**⚠️ 미해결 / 확인 필요**
- 채워진 도매 텍스트로 `/api/generate` 실호출은 과금이라 이번에도 안 함.
- `/create/result`는 sessionStorage가 있어야 해서 Playwright는 프리뷰만 클릭 검증.
- 스마트스토어 네이버 API 연동 없음. 업로드는 상세 이미지 교체.
- 후기/인증/네이비 솔리드 밴드는 슬롯·토큰 밖이라 재현하지 않음.
- 지시문의 "풀 옵션 1건 재생성"은 호출하지 않음 (과금 + 로그인 세션).

**다음에 확인할 3가지**
1. 실제 생성본 `/create/result`에서 3탭이 기대한 UX인지 (세션 필요).
2. 도매 텍스트를 채운 AI 재생성 1회만 과금 감수하고 볼지.
3. 랜딩 모션이 너무 조용한지 / 줄일지 (`prefers-reduced-motion` 포함).

---

## 시간순 기록

### 시작

- 브랜치 `merge-pagelab-work` (main 손대지 않음). working tree 깨끗.
- 이전 런의 버튼은 있었으나 탭이 아니고, 이미지 교체가 hover-only라 모바일에서 안 보임 → 탭 + 상시 뱃지로 가기로 함.
- 상세 opacity 스크롤 애니메이션은 `html-to-image` 다운로드를 가릴 수 있어 **랜딩만** 적용.

### 1순위 — 결과 수정 탭

- `DetailActionBar`를 3탭 패널로 재구성. 결과/프리뷰 공통.
- 편집 탭 진입 시 편집 모드 ON. 스펙 표도 인라인 수정.
- 업로드 탭: 교체할 사진 번호 선택 + 8MB/형식 메시지.
- AI 탭: 빈 입력이면 API 호출 없음 (가드 유지).
- Playwright `scripts/test-action-bar.ts`: saveToast / emptyGuard / typeError / sizeError / hadInput 전부 true.

### 2순위 — 역동성

- `RevealOnScroll` + `globals.css` ken-burns/float. 브랜드 토큰 색만 사용.
- 프로세스/기능/요금 카드 `hover:-translate-y-1`. CTA `active:scale-[0.98]`.

### 3순위 — 레퍼런스 연습

- Cycle 2–4: POINT/히어로 라벨 mono, 사용법 간격, 갤러리 제목–사진 밀착, CTA 자간.
- Cycle 5–6: 무변경. 후기·솔리드 밴드는 §9 금이라 중단.
- 평균 4.45. 풀 옵션 재생성 스킵.

### Git

- 커밋은 `merge-pagelab-work`만. `origin/main`은 그대로.
