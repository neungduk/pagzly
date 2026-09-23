# 248차 — 247차 export HTML 풀페이지 스크린샷 (PC에서 렌더 — 유료 API 불필요)

생성: 2026-09-23 · 유료 API **0건** (이미 있는 정적 HTML을 브라우저로 열어 캡처만)

## 배경

247차로 복구한 `review/247cha-recovered/showcase.html`을 Claude가 클라우드 샌드박스에서
직접 렌더해봤으나, 샌드박스의 조직 egress 정책이 Supabase Storage
(`qnstsrplqzoqlndojuyw.supabase.co`) 접근을 막고 있어 **이미지가 전부 깨진 채로
렌더됨** — 그 결과만으로는 배경/인포그래픽/사진 배치 상태를 신뢰할 수 없음(빈 박스가
"버그로 이미지가 안 뜨는 것"인지 "네트워크 차단 때문"인지 구분 불가). PC에서는 Supabase
접근이 정상이므로, **PC에서 직접 렌더한 스크린샷**이 필요함.

## 1. 실행 (유료 API 없음 — 로컬 정적 파일 렌더·캡처만)

`review/247cha-recovered/showcase.html`을 Playwright로 열어 풀페이지 스크린샷:

```ts
// 새 파일: scripts/248cha-export-full-screenshot.ts
import { chromium } from "playwright";
import path from "path";

async function main() {
  const file = path.join(__dirname, "..", "review", "247cha-recovered", "showcase.html");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 750, height: 1000 } });
  await page.goto(`file:///${file.replace(/\\/g, "/")}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1500); // 이미지 로드 + fillBar/ringFill 애니메이션 안정화
  await page.screenshot({
    path: path.join(__dirname, "..", "review", "248cha-export-full.png"),
    fullPage: true,
  });
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

`npx tsx scripts/248cha-export-full-screenshot.ts`로 실행.

## 2. 확인 사항 (보고에 포함)

- `review/248cha-export-full.png` 파일 크기·세로 픽셀 수(대략 몇 px인지, `sips`나
  Node의 이미지 라이브러리로 확인 가능하면 포함 — 최소 없어도 됨).
- 스크린샷에서 이미지가 실제로 로드됐는지 육안 확인(빈 회색/그라디언트 박스가 아니라
  실제 제품 사진이 보이는지) — Claude가 이후 직접 열람해 판단할 예정이므로 Cursor는
  "이미지 로드됨/안됨"만 한 줄로 보고.

## 3. 보고 형식

`review/248cha-report.md`에:
- 스크린샷 저장 경로·파일 크기.
- 이미지 로드 여부(육안 확인 결과 한 줄).
- API generate: 0.

이번 라운드는 새 코드 로직 없음 — 기존 정적 HTML을 브라우저로 열어 캡처하는 것뿐이라
검증 스크립트 별도 불필요.
