# 병합 분석: origin/main ↔ origin/pagelab-work

상태: **병합 보류**. `merge-pagelab-work`는 `origin/main`과 동일한 커밋에 멈춰 있고, 충돌을 임의로 해결하지 않았습니다.

확인용 브랜치: `merge-check` → `origin/pagelab-work`를 추적합니다.

---

## 1. 히스토리

공통 조상(`merge-base`)이 **없습니다**. 두 브랜치는 unrelated histories입니다.

| 브랜치 | 최신 커밋 |
|--------|-----------|
| `origin/main` | `fdaa7f6` docs: add visual concept reference patterns for detail page QA |
| `origin/pagelab-work` | `db44537` 6시간 자동 작업 결과 (단일 커밋) |

`pagelab-work`는 다른 폴더에서 `git init` 후 스냅샷을 올린 것으로 보입니다. 커밋 그래프는 갈라져 있지만, **파일 트리**는 main과 거의 같고 22개 파일만 다릅니다.

`--allow-unrelated-histories`로 시험 병합했다가 충돌이 커서 `git merge --abort`로 되돌렸습니다.

---

## 2. 트리 비교 (내용 기준)

`git diff origin/main origin/pagelab-work` → **22 files, +1128 / −139**

### 새로 추가됨 (pagelab-work만, 충돌 없음)

- `PROGRESS_LOG.md`
- `app/dev/detail-preview/page.tsx`
- `components/DetailActionBar.tsx`
- `components/EditableText.tsx`
- `components/ToastBanner.tsx`
- `lib/image-upload.ts`
- `scripts/test-action-bar.ts`
- `screenshots/01-hero.png` ~ `08-gallery-showcase.png`

### 삭제됨

없음.

### 양쪽 모두 있고 내용이 다름 (시험 병합 시 add/add 충돌)

| 파일 | 규모 | 성격 |
|------|------|------|
| `components/DetailSectionRenderer.tsx` | +441/−136급, 충돌 마커 **30곳 이상** | main은 카드(`rounded-2xl border` + `SECTION_GAP`). work는 풀폭 블록 + 인라인 편집 API. 둘 다 `conceptIcons`는 있음. |
| `app/create/result/page.tsx` | +206, 충돌 **8곳** | work가 직접편집/업로드/AI 툴바를 추가. |
| `review/reference-patterns.md` | +122, 충돌 **6곳** | work가 2026-08-15 외부 레퍼런스 §8–§9를 추가. |
| `app/page.tsx` | 충돌 **2곳** | 랜딩 히어로 타이포·여백. |
| `components/PipelineCard.tsx` | 충돌 **1곳** | RAW 영역 비율 `4/3` → `4/5`. |
| `components/CreateProductForm.tsx` | 충돌 **1곳** | wholesale 요청 body 콘솔 로그. |
| `app/api/generate/route.ts` | 충돌 **1곳** | incoming `wholesaleUrl` 로그. |

### 최근에 같이 손댄 파일

- `components/DetailSectionRenderer.tsx` — **겹침, 충돌 많음**
- `lib/design-tokens.ts` — **차이 없음** (3색·슬롯 비율 토큰 동일)
- `review/` — `reference-patterns.md`만 다름. `CHECKLIST.md` 등은 동일

---

## 3. 시험 병합 결과

`git merge origin/pagelab-work --allow-unrelated-histories` 기준:

- 신규 파일 15개는 자동 추가됨
- 위 7개 파일은 `CONFLICT (add/add)`
- 렌더러 한 파일만 충돌 구간이 수십 개라, 자동으로 한쪽을 고르지 않고 중단함

---

## 4. 선택지 (아직 적용하지 않음)

**A. pagelab-work 버전으로 그 7개 파일을 덮어쓰기**  
`merge-pagelab-work`(main) 위에서:

```
git checkout origin/pagelab-work -- <충돌 7개 + 신규 파일들>
```

- 얻는 것: 6시간 작업(풀폭 레이아웃, 편집/업로드/AI 가드, 레퍼런스 §8)
- 잃을 위험: main에만 있고 work 스냅샷에 없는 **그 7개 파일 안의** 이후 수정. 트리 비교상 그 7개는 work가 main을 확장한 형태로 보임(기능 삭제는 카드 레이아웃을 풀폭으로 바꾼 것).
- 히스토리: main의 커밋 그래프는 유지되고, 파일만 work 내용이 됨. unrelated merge 커밋은 없음.

**B. main 버전 유지**  
6시간 작업의 렌더러·툴바·레퍼런스 보강이 빠짐. 신규 파일도 안 들어옴.

**C. 파일마다 수동 병합**  
렌더러는 레이아웃이 통째로 달라 줄 단위 병합 이득이 적음. 로그 한 줄짜리(`generate/route.ts`, `CreateProductForm.tsx`)만 수동으로 맞춰도 되고, 렌더러/결과페이지는 A가 사실상 필요.

**D. unrelated-histories merge를 끝까지 밀고 충돌을 손으로 제거**  
A와 결과 트리는 비슷하지만 커밋이 두 루트를 합친 merge commit이 됨. 충돌 마커가 커서 실수 위험이 큼.

권장(아직 실행 안 함): **A**. 확인 후 `merge-pagelab-work`에 커밋하고 origin에만 push. **main에는 병합·push 하지 않음.**
