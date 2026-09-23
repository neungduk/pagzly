# 245차 — beauty showcase 스크립트 진입 URL 수정

생성: 2026-09-23 · 유료 API **0** · 파일 1개(1줄)

## 한줄 결론

`/create` → `/create/detail`로 고침. 선택 페이지에 `<select>`가 없어 244차가 타임아웃한 원인을 스크립트만 맞춤. **재실행은 하지 않음.**

---

## 1. diff

```diff
-  await page.goto(`${BASE_URL}/create`, { waitUntil: "networkidle" });
+  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
```

`git diff --stat`: `1 file changed, 1 insertion(+), 1 deletion(-)`

---

## 2. 검증

- `npx esbuild scripts/generate-beauty-showcase-one.ts --bundle=false --format=esm --outfile=NUL` → OK
- 실사 `npx tsx scripts/generate-beauty-showcase-one.ts` → **미실행** (사용자 재허가 대기)

API generate: 0
