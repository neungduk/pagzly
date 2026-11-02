# 474차 V5 서체 라이선스

법률 자문이 아닙니다. SIL OFL 1.1 원문을 각 패키지 LICENSE에서 확인했습니다(2026-11-02).

| 폰트 | 용도(아키타입) | 라이선스 | 상업·임베드 | 출처 |
|------|----------------|----------|-------------|------|
| Noto Sans KR | catalog 제목·대부분 본문 | OFL 1.1 | 허용 | `@fontsource/noto-sans-kr` (기존 432) |
| Noto Serif KR | narrative·luxe 제목, narrative 보조 | OFL 1.1 | 허용 | `@fontsource/noto-serif-kr` |
| Gowun Batang | editorial 제목, narrative 본문 | OFL 1.1 | 허용 | `@fontsource/gowun-batang` |
| Gowun Dodum | softlife 제목 | OFL 1.1 | 허용 | `@fontsource/gowun-dodum` |
| Black Han Sans | impact 제목 | OFL 1.1 | 허용 | `@fontsource/black-han-sans` |
| Do Hyeon | techsheet 제목·숫자 | OFL 1.1 | 허용 | `@fontsource/do-hyeon` |
| Jua | pop 제목 | OFL 1.1 | 허용 | `@fontsource/jua` |

**제외:** Gmarket Sans 등 원문 미확인 폰트(430표와 동일).  
빌드: `scripts/build-detail-fonts.mjs` + `scripts/build-v5-fonts.mjs` → `public/fonts/`(gitignore). CDN 없음. 고지는 각 `*.css` 머리말.
