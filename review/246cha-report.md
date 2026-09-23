# 246차 — 화장품 실사 1건 재실행 (부분 성공 → 결과 페이지 미도달)

생성: 2026-09-23 · 스크립트 **1회만** 실행 · 재시도 **없음**

## 한줄 결론

245차 URL 수정으로 `/create/detail` 폼·draft·배경 피커까지는 성공. 서버에서 **최종 `POST /api/generate` 200(3.1min)** 까지 끝났으나, Playwright가 `/create/result` 네비게이션을 **480초 대기 타임아웃** → showcase/session **미캡처**.

---

## 1. 실행

```
npx tsx scripts/generate-beauty-showcase-one.ts   # 정확히 1회
```

로그 (`review/beauty-showcase-one/run-console-246.txt`):

```
[1/5] Pexels 크롤 8장 OK
[2/5] /create/detail 폼 OK
[3/5] 승인 → 최종 생성
[3/5] 배경 후보 #0 선택
page.waitForURL(/\/create\/result/) Timeout 480000ms exceeded  (line 176)
exit_code: 1  elapsed ≈ 644s
```

---

## 2. API / 비용 (서버 로그 기준)

| 호출 | 결과 |
|------|------|
| `POST /api/generate` (draft) | **200** in 77s |
| `POST /api/generate-backdrop` | **200** in 58s · 후보 4장 |
| 배경 피커 | **후보 #0** 자동 선택 (스크립트 로그) |
| `POST /api/generate` (최종) | **200** in 3.1min |
| `GET /create/result` | **0건** (클라이언트 미도달) |

- 스크립트 실행 횟수: **1**
- 유료 생성 파이프라인: draft 1 + final 1 (한 번의 “승인하고 최종 생성” 플로우). 추가 재실행 **없음**.
- `[cost] … $x` 로그 합산 ≈ **$1.2812** (draft+backdrop+enhance+icons 등 포함, 서버 터미널 113줄 합).
- 부가 이슈(생성은 계속됨):
  - section-backdrop NSFW 1건 실패
  - cosmetics annotation JPEG/PNG media-type 400 (스킵)

---

## 3. 산출물 mtime

| 파일 | mtime | 이번 갱신? |
|------|-------|------------|
| `01-draft.png` | **2026-09-23 02:05** | ✅ (514,713 B) |
| `pexels-sources.json` | 2026-09-23 02:04 | ✅ |
| `run-console-246.txt` | 2026-09-23 02:14 | ✅ |
| `showcase-detail.png` | 2026-08-28 | ❌ 미갱신 |
| `showcase-full.png` | 2026-08-28 | ❌ |
| `showcase.html` | 2026-08-28 | ❌ |
| `session.json` | 2026-08-28 | ❌ |
| `meta.json` | 2026-08-28 | ❌ |

→ 결과 페이지 산출물은 **이번 실사가 아님**(8/28 잔존).

---

## 4. 섹션 목록

최종 `session.json`이 없어 **확정 목록 불가**.  
draft 단계 DeepSeek 응답에서 파싱한 type 순서(17):

`hero, brand_story, checklist, image_text×6, target_persona, highlight_box, illustration_banner, step_card, gallery, stat_infographic, comparison_chart, tradeoff_card`

(최종 generate 후 enrich로 섹션이 더 늘어난 상태로 서버는 200을 반환했으나 클라이언트가 result에 못 감.)

draft 스크린샷: `01-draft.png` (기획 초안 UI 확인됨).

---

## 5. 실패 원인 (정직)

서버 final generate는 **성공(200)**. 스크립트는 배경 확정 후 `waitForURL(/create/result)`만 기다리다 타임아웃.  
가능한 원인 후보(미검증, 재시도 안 함): generate 응답 후 프론트 리다이렉트 지연/실패, 아이콘 후속 작업과 클라이언트 상태 불일치, sessionStorage 미설정 등.

API generate (스크립트 관점 1회 플로우): draft+final **각 1회 POST** · showcase 캡처 **실패** · 재시도 **0**
