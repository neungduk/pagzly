# 521차 보고서 — 토스 미니앱 정적 점검 화면

## 확인하지 못한 항목
- 토스 샌드박스 앱·실기기에서 B-1 실험 화면 실측 없음(PC Vite만 로컬 빌드 검증).
- 모바일 폭(360~430px) 실기기 가로 스크롤 미확인(CSS max-width만 적용).
- `ResultView517`/`OcrReview517` 재사용 **포기** → 단순 결과 목록·글상자 OCR 확인(next 의존 CSS·무대 레이아웃 없이 실험 우선). shim(`next/link`)은 두었으나 결과 컴포넌트는 연결하지 않음.
- 사진 앨범 API·HEIC·PDF가 토스 WebView에서 되는지는 커뮤니티 답변만 있고 실측 없음.
- Vercel env(`LABEL_TOSS_ENABLED` 등)는 Cursor가 설정하지 못함 → 사용자 할 일.

## 사용자가 할 일
1. 토스 개발자 콘솔 가입 후 앱 등록하고 **앱 이름**을 정한 뒤, 토스 앱이 깔린 폰에 샌드박스 앱을 설치한다.
2. `appName`은 이미 `pagzly`(콘솔 등록명·Origin `https://pagzly.apps.tossmini.com`). granite의 displayName·icon 자리표시자만 콘솔 값으로 바꾼다.
3. Vercel에 `LABEL_TOSS_ENABLED=1`을 넣고, 필요하면 `LABEL_CORS_ORIGINS`에 샌드박스·개발 Origin을 **글자 그대로** 추가한 뒤 재배포한다. (`NEXT_PUBLIC_LABEL_API_BASE=https://pagzly.com`은 토스 번들 Vite 기본값과 맞춘다.)
4. PC에서 `cd toss-app` → `npm install` → `npm run dev` 후, 같은 LAN IP:5173을 폰 샌드박스 앱(또는 터널)으로 연다.
5. 실험 화면에서 파일·단계 버튼을 눌러 본 뒤 **진단 결과 복사**로 결과를 채팅에 붙여 넣는다.

## 구현 요약
- `toss-app/` — Vite + React 19.2.8 + TS, `@/` → 저장소 루트, `VITE_LABEL_API_BASE`→`process.env.NEXT_PUBLIC_LABEL_API_BASE`(기본 `https://pagzly.com`).
- PDF: `window.__PAGZLY_PDFJS_BASE__` (기본 `/label-check-pdfjs` 유지). 토스는 `./label-check-pdfjs`. 복사 스크립트 `toss-app/scripts/copy-label-check-pdfjs.mjs`(git 제외).
- 루트 `tsconfig`/`eslint`에서 `toss-app` 제외. 루트 `package.json` 의존성 미변경.
- SDK: 문서상 3.x는 `apps-in-toss.config.ts` — **이 파일로 `ait build` 성공**. `granite.config.ts`도 병행(지시서 파일명). `appName: "pagzly"`. 산출물 `*.ait`(gitignore).

## 문서 C
- `docs/toss-miniapp-notes.md`에 **출시 전 확인 목록** 추가(내비·SSR 금지·TDS 권장·외부 도메인 WebView 반려 등). 우리 화면 위반 소지 표기함.

## 검증
- `npx tsc --noEmit`(루트) 통과
- `npm run regression:label-check` **33/33** 통과
- `toss-app` `npm run build`(vite) 통과
- `npx ait build` 통과(자리표시자 appName으로 `.ait` 생성)

## PC에서 B-1 확인
```
cd toss-app
npm install
npm run dev
```
브라우저 `http://localhost:5173` — 상단 **실험** 영역·파일 3종·단계 버튼·진단 복사.

## 커밋 (cloud-work, main 미푸시)
1. `a0bfae2` — PDFJS_BASE·루트 격리
2. `268a312` — toss-app Vite 실험·점검 UI (`appName: pagzly`)
3. tip — 회귀·문서·보고서
