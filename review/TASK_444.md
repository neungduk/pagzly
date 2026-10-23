TASK_444 — 클라우드에서 눈 검수(정적 export 캡처) + 443 판단 3건 확정 + 리듬 재설계 + 남은 섹션 마감 (코딩 중심, 유료 API 0회)
실행 환경: 클라우드 세션(cloud-work 브랜치, .env·외부 키·dev 서버 없음). 선행: 443차 완료(review/443cha-report.md).
시작 문장: "444차 시작: 클라우드 눈 검수와 리듬 재설계".
배경
443차는 화면을 한 번도 보지 못한 채(캡처 0) 이전 섹션을 고쳤다. 그런데 클라우드에도 Chromium + Playwright가 설치돼 있고(PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers), export HTML은 서버 없이 page.setContent로 열 수 있다. 서버가 필요한 것은 라이브 화면뿐이므로 export 렌더 기준 눈 검수는 클라우드에서 가능하다. (443차 "캡처 금지"는 이번 차수에서 해제 — 단 정적 export HTML 캡처만, dev 서버·외부 네트워크 사진 로딩 없이.)
