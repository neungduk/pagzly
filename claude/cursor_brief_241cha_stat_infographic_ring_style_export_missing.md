# 241차 — stat_infographic "ring"(원형 게이지) 스타일이 export에서 막대바로 오출력되는 버그 수정

생성: 2026-09-23 · 유료 API **불필요** · 파일 1개(`lib/export-detail-html.ts`)

## 한줄 결론

`stat_infographic` 섹션의 metric.style이 `"ring"`(원형 게이지)일 때, 라이브는 `RadialGauge`(SVG 원형)로 렌더링하지만 export는 이 스타일을 전혀 구분하지 않고 `"bar"`(막대바) 분기로 흘려보내 **다른 모양으로 나온다**. 판매자가 실제로 내보내는(export) 페이지에서 벌어지는 라이브/익스포트 시각 불일치 — 231/232/236차와 같은 결함 계열.

---

## 1. 근거 (코드로 확인 완료)

- `lib/types/generate.ts:370` — `stat_infographic` metric의 `style` 타입은 `"bar" | "number" | "ring"` 3종. `"ring"`은 154차부터 실존하는 정식 스타일이며 목업/죽은 코드가 아님.
- `app/api/generate/route.ts:892,952,1107-1108` — DeepSeek 카피 생성 프롬프트가 "비율/점유율 수치는 style:bar\|ring+percent로(**원형 강조는 ring**)"이라고 AI에게 명시적으로 지시하고, 서버가 `style === "ring"`이면 그대로 보존해 세션에 저장(`"number"`/`"ring"`/그 외→`"bar"` 3-way 정규화). 즉 실제 생성 데이터에 `style:"ring"` metric이 나오는 것이 설계상 정상 경로.
- `components/DetailSectionRenderer.tsx:2619-2621` — 라이브는 `numberMetrics`/`ringMetrics`/`barMetrics` 3그룹으로 나눠 각기 다른 컴포넌트로 렌더링. `ringMetrics`는 2747행 `<RadialGauge percent={percent} theme={theme} size={112} strokeWidth={10} />` (SVG 원, `stroke-dashoffset`으로 percent 표시, 중앙에 큰 숫자).
- `lib/export-detail-html.ts:319-329` — export의 `stat_infographic` case는 `if (m.style === "number") {...}` 분기 하나뿐이고, 그 외 전부(즉 `"bar"`와 `"ring"` 둘 다) 같은 막대바 HTML로 렌더링됨. `"ring"`을 별도로 취급하는 코드가 전혀 없음(grep 0건) — 판매자가 실제로 export한 상세페이지에서는 원형 게이지가 막대바로 바뀌어 나감.

**스코프 밖(참고만, 이번 수정 대상 아님)**: 라이브는 `numberMetrics`/`ringMetrics`/`barMetrics`를 스타일별로 그룹 지어 순서를 재배치하고 `number`/`ring` 그룹엔 `LayeredPanel` 카드+`ConceptBadgeIcon` 아이콘을 추가로 씌우는데, export는 원본 배열 순서 그대로 단순 세로 리스트로만 렌더링합니다. 이 레이아웃/카드 스타일 차이는 훨씬 큰 스코프(카드 컴포넌트·아이콘 배선 전부 새로 필요)라 이번엔 손대지 않습니다 — 이번 수정은 "ring이 아예 다른 모양(막대바)으로 나온다"는 명백한 버그 1건만 좁게 고칩니다.

---

## 2. 수정

### `lib/export-detail-html.ts` — `case "stat_infographic":` 내부 `metricsHtml` 매핑

`if (m.style === "number") { ... }` 분기 바로 다음에 `"ring"` 분기를 추가하고, 기존 bar 분기는 그대로 유지합니다(순서: number → ring → bar 폴백).

```ts
          if (m.style === "number") {
            // 154차 — 라이브 렌더러와 동일하게 숫자를 "히어로 넘버"로 키움(2rem→3rem,
            // 700→800, 라벨은 소문자 캡션에서 대문자 트래킹 라벨로).
            return `<div style="text-align:center"><div style="font-size:${FONT_SIZE.statNumber};font-weight:800;line-height:1;letter-spacing:-0.02em;color:${deepText}">${esc(m.value)}${footnoteMarkFor(m)}</div><div style="margin-top:6px;font-size:${FONT_SIZE.caption};font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.55">${esc(m.label)}</div></div>`;
          }
          if (m.style === "ring") {
            // 241차 — 라이브 RadialGauge(size=112, strokeWidth=10)와 동일 기하로
            // SVG 원형 게이지를 정적 생성. stroke-dashoffset은 percent로 결정론적
            // 계산(애니메이션은 .fill-bar와 동일한 순수 CSS keyframe, JS 불필요).
            const size = 112;
            const strokeWidth = 10;
            const radius = (size - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference * (1 - pct / 100);
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
                <div style="position:relative;width:${size}px;height:${size}px">
                  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)" aria-hidden="true">
                    <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${hexToRgba(accent, 0.16)}" stroke-width="${strokeWidth}"/>
                    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${deep}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" style="--ring-empty:${circumference};--ring-offset:${offset}"/>
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${FONT_SIZE.section};font-weight:800;letter-spacing:-0.01em;color:${deepText}">${esc(m.value)}${footnoteMarkFor(m)}</div>
                </div>
                <span style="font-size:${FONT_SIZE.caption};font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.55">${esc(m.label)}</span>
              </div>`;
          }
          const barColor = section.barAccent === "emphasis" ? deep : accent;
```

(이 아래 기존 `return` 막대바 블록은 무변경 — 이제 `"bar"` 및 미지정 스타일에만 도달.)

`pct`는 이 매핑 블록 최상단에 이미 `const pct = Math.min(100, Math.max(0, m.percent ?? 0));`로 선언돼 있으므로 그대로 재사용(신규 변수 아님). `accent`/`deep`/`deepText`/`hexToRgba`/`FONT_SIZE`/`esc`는 전부 `sectionHtml` 함수 스코프에 이미 존재하는 기존 바인딩 — import 추가 불필요.

### `lib/export-detail-html.ts` — 공유 `<style>` 블록 (약 1235~1242행)

기존 `.fill-bar` 애니메이션 바로 아래에 `.ring-fill` keyframe 추가, `prefers-reduced-motion` 셀렉터 목록에 `.ring-fill` 포함:

```diff
   @keyframes fillBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
   .fill-bar{transform-origin:left center;animation:fillBar .9s ease-out both}
+  @keyframes ringFill{from{stroke-dashoffset:var(--ring-empty)}to{stroke-dashoffset:var(--ring-offset)}}
+  .ring-fill{animation:ringFill 1s cubic-bezier(.22,1,.36,1) both}
   @keyframes pulseCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
   .pulse-card{animation:pulseCard 2.4s ease-in-out infinite}
   @media (max-width:750px){
     .pagzly-cta{position:sticky;bottom:0;z-index:20;box-shadow:${ELEVATION.ctaSticky}}
   }
-  @media (prefers-reduced-motion:reduce){.fill-bar,.pulse-card{animation:none!important}}
+  @media (prefers-reduced-motion:reduce){.fill-bar,.pulse-card,.ring-fill{animation:none!important}}
```

**변경 파일은 이 1개뿐**. `components/DetailSectionRenderer.tsx`(라이브)는 이미 정상 동작 중이라 무변경.

---

## 3. 검증 스크립트 스펙 — `scripts/241cha-stat-infographic-ring-verify.ts`

유료 API 불필요(순수 함수·정적 HTML 생성 로직만). `npx tsx scripts/241cha-stat-infographic-ring-verify.ts`로 실행, 아래 전부 통과해야 `ALL PASS`:

1. **유닛 — 기하 공식**: `size=112,strokeWidth=10` → `radius=51`, `circumference=2π·51≈320.44`를 직접 계산해 검증. `percent=0` → `offset===circumference`(완전히 빈 원), `percent=100` → `offset===0`(완전히 찬 원), `percent=50` → `offset`이 `circumference`의 정확히 절반. `percent=150`(범위 밖 입력)·`percent=-20`도 0~100으로 클램프되는지 확인(기존 `pct` clamp 재사용 확인).
2. **`buildDetailPageHtml()` 실제 호출 — 3종 스타일 혼합 픽스처**: `stat_infographic` metrics에 `style:"number"` 1개 + `style:"ring"` 2개(percent 30/80) + `style:"bar"` 1개를 섞은 합성 섹션으로 실제 export 함수를 호출.
   - export HTML에서 `class="ring-fill"` 정확히 2개(ring 스타일 개수와 일치) 존재 확인.
   - 두 ring의 `stroke-dashoffset` 속성값이 각각 위 공식으로 손으로 재계산한 값과 소수점 둘째 자리까지 일치.
   - `style="bar"` 항목은 여전히 `class="fill-bar"`로 렌더링(회귀 없음 확인).
   - `style="number"` 항목은 `font-size:${FONT_SIZE.statNumber}` 큰 숫자로 렌더링(회귀 없음 확인).
3. **각주(footnote) 회귀**: `basis:"measured"`+`sourceNote` 있는 ring metric 1개 포함 픽스처로, `footnoteMarkFor()`가 ring 분기에서도 number/bar 분기와 동일하게 정상 동작(각주 번호 표시·하단 목록 생성)하는지 확인 — ring 분기 추가 중 이 기존 로직을 실수로 건너뛰지 않았는지 검증.
4. **회귀 — 231/232/236/237/238차**: 기존 검증 스크립트(있는 것 전부) 재실행해 무관 영역 회귀 없음 확인.
5. **`components/DetailSectionRenderer.tsx` mtime 불변** 확인(export 전용 수정 원칙 준수).

가능하면 Playwright로 export HTML을 렌더해 원형 게이지가 실제로 원 모양으로 그려지는지 스크린샷 1장(`ring-gauge-export.png`) 첨부 — 합성 픽스처(`style:"ring", percent:65` 등)로 충분, 실사진/유료 API 불필요.

---

## 4. 회귀 확인 항목

- `stat_infographic`의 기존 `"number"`/`"bar"` 스타일 출력이 이번 수정으로 바뀌지 않는지(코드 위치만 이동, 로직 무변경).
- `comparison_chart`(같은 파일의 별도 case, RadialGauge와 무관)는 이번 수정과 무관 — 영향 없음 재확인.
- 공유 `<style>` 블록 수정이 다른 섹션(`.fill-bar`/`.pulse-card` 사용처)에 영향 없는지 확인.

유료 API 0건(조사·수정·검증 스크립트 전부).
