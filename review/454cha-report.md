# 454차 보고서 — PC 검증 결함 수정(tsx·섹션 단독 off·세션 패리티)

## 결과 / 커밋
- **push: 실패(미실행)** — 이 세션의 권한 설정이 `git push`를 거부했다. 커밋은 모두 로컬 `cloud-work`에 있고, push는 `git push origin cloud-work`로 해야 한다(main 아님).
- **`npm run pc-verify`: 합격 17 · 불합격 0 · 건너뜀 1**(9g 라이브 하네스는 `--full`에서만). 요약 `review/pc-verify-2026-10-26b/summary.md`. 회귀 127/127, tsc 0, build 합격, launch-smoke 53/53.
- 커밋: 0 지시서 저장 `daa373c` · 1 tsx `e2f2ba6` · 2 섹션 단독 off `b5fcf01` · 3 패리티 `e6d7854` · 4 문서·요약 `f60038a`, `afc4005`.
- 렌더 코드 변경 0: `git diff 04f9c9a HEAD -- lib components app` 비어 있음(453차 대비 export·라이브 출력 동일).

## 불합격 3건: 원인·수정·확인
1. **tsx 없음** — `package.json`에 없어서 PC에서 `npm run pc-verify` 불가. `devDependencies`에 `tsx ^4.23.15`(설치 4.23.15) 추가, `package-lock.json`을 `npm install -D`로 갱신(+519줄, 대부분 esbuild 플랫폼 패키지). `docs/pc-verify.md` 맨 위에 `npm ci` → `npm run pc-verify` 순서. 확인: `npm run pc-verify`가 실제로 실행됨.
2. **`v4 총정리 문서` 회귀 실패** — `docs/v4-overview.md`가 저장소에 없는 `scripts/_snap-iso.tmp.tsx`를 참조. 원본은 이력에도 없어 443~452차 보고서의 설명("섹션 하나씩 단독 렌더해 off 기준과 문자열 비교, export+라이브")으로 **다시 작성**해 `scripts/check-v4-off-section.tsx`로 추가(원본과 동일한지는 확인 불가). 문서 참조 수정, 회귀가 `git ls-files` 기준으로만 경로를 인정하고 `_`/`.tmp` 이름은 거부. `pc-verify`에 4c 단계 추가(기준 없으면 건너뜀 + 만드는 명령 출력), 회귀 등록. 확인: 회귀 통과, 4c 1298건 diff 0.
   - **주의**: 4c 기준 스냅샷(`review/454-verify/snap-section`)은 이번에 **453차 끝 코드(v4 off)로 만들었다**. 438차 기준이 아니므로, "453차 대비 diff 0"만 증명한다. 4a·4b는 기존 438차 기준 그대로 합격.
3. **세션 패리티 불일치(계획 29·라이브 29·export 34)** — 가설대로였다. export의 안쪽에 중첩된 `<section>`(검색용 평문 블록 5~6개)을 전체 수에 더해 세던 것. `scripts/section-parity.ts`가 `.pagzly-wrap` 직계 `<section>`만 센다(마크업 변경 없음).

## 패리티 표 (`review/454-verify/section-parity.md`, 저장 세션 6 + x-세션 4 + 합성 21 = 31행)
- **불일치 0.** 예: s411 계획 29·라이브 29·export 최상위 29·내부 중첩 5. 모든 행에서 내부 중첩이 5~6이라 옛 판정의 +5~6과 일치.
- 발견: 한 계획 섹션이 export에서 최상위 `<section>` 둘로 나뉘는 경우가 있다 — s418·s422(15번 stat_infographic, 지표 3개)와 합성 3종(shampoo·collagen·tint). export가 계획보다 +1. 단독 렌더로 이 차이가 정확히 설명될 때만 일치로 본다. **렌더 출력은 바꾸지 않았다** → 이 분리가 의도인지는 사람 결정 대기.
- 발견: 라이브에서 같은 `data-section-index` 번호가 두 요소에 붙는 섹션이 있다(비교표·일부 impact). 번호 기준으로 센다.
- 한계: 분리 판정은 impact 섹션을 제외한 단독 렌더 힌트라, impact 섹션이 둘로 나뉘면 설명하지 못하고 불일치로 남는다(음성 방향이라 안전). 음성 회귀: CTA 섹션을 지운 export가 불일치로 잡힘.

## 4. 그 외
- `docs/predeploy-static.md`: `metadataBase` 경고(`NEXT_PUBLIC_SITE_URL` 미설정 시 `siteBase()`가 undefined) 설명과 배포 시 설정 항목. 코드 변경 없음.
- `pc-verify` 요약 git 표시: "추적 수정 6 · 삭제 697 · 미추적 798"로 분리.
- `docs/pc-verify.md`: PC에서 cloud-work 받는 법(백업 → `git merge --ff-only`).

## 못 한 것 / 사람 결정 대기
- push(권한 거부). 스테이징은 이름 지정으로만 했고, `review/` 파일은 요청에 따라 `TASK_454.md`·`454-verify/section-parity.md`·이 보고서만 `-f`로 추가.
- stat_infographic export 분리 유지 여부.
- 4c 기준을 438차 코드로 다시 만들지(`OUT=review/454-verify/snap-section npx tsx scripts/check-v4-off-section.tsx --write`를 438차 worktree에서).
- 작업 폴더에는 이번 차수와 무관한 기존 수정·삭제·미추적 파일이 많다(스테이징 안 함).

## 다음
`git push origin cloud-work` 후, 다른 PC에서는 `npm ci` → `npm run pc-verify`. 합격 기준: 불합격 0, 회귀 127/127, 패리티 표 불일치 0.
