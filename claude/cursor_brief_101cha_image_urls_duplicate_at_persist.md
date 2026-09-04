# 101차 — `image_urls`에 같은 URL이 중복 저장되는 문제 (99차 근본 원인 정정)

생성: 2026-09-03
전제: 99차 리포트는 근본 원인을 **"(2) 배정/인덱스 0 수렴"** 으로 결론내고 배정 로직(round-robin·절반 상한·연속 회피)을 수정했습니다. 리포트에 적힌 대로 DB 행 조회가 안 돼서(`MCP SQL 인증 실패 + 로컬 anon RLS`) enhanced 개수는 미확정으로 남았습니다.

**그 DB 행을 브라우저 세션으로 직접 조회했고, 결론이 다릅니다.** 배정 로직 문제가 아니라 **저장된 `image_urls` 배열 자체에 같은 URL이 3번 들어 있습니다.**

## 확인된 사실

Supabase REST를 브라우저(로그인 세션)에서 직접 조회한 결과:

| 상품 | `image_urls` 길이 | **고유 URL** | 내용 |
|---|---|---|---|
| 글로위스트 v3 `49f8192b-…` | 5 | **3** | 상품컷 **1장이 3번 반복** + compare-before + compare-after |
| 히알루론 세럼 `7dca0930-…` | 9 | **9** | 상품컷 7장(전부 다름) + compare-before + compare-after |

글로위스트의 배열은 이렇게 저장돼 있습니다:

```
[ 1787709148498-73bc5c69-…,     ← 같은 파일
  1787709148498-73bc5c69-…,     ← 같은 파일
  1787709148498-73bc5c69-…,     ← 같은 파일
  1787709297896-compare-before.png,
  1787709297896-compare-after.png ]
```

즉 **배정 단계가 인덱스 0으로 수렴한 게 아니라, 배정이 고를 수 있는 풀 자체에 같은 사진이 3장 들어 있었습니다.** 배정 로직은 5개 슬롯에 5개 항목을 정상적으로 분배했지만 그중 3개가 동일 파일이라 화면에서 같은 컷이 반복된 것입니다.

**따라서 99차에서 넣은 round-robin·절반 상한 가드로는 이 케이스가 해결되지 않습니다.** 동일 URL이 3개 들어 있는 풀에 round-robin을 돌려도 같은 그림이 3번 나옵니다. (99차 수정 자체는 옳고 유지할 가치가 있습니다 — 다만 필요조건이지 충분조건이 아닙니다.)

참고로 99차 수정 배포 후 글로위스트 결과 페이지를 다시 열어 DOM을 재측정했으나 **고유 이미지 4개 / 최다 반복 30회로 변화 없음**을 확인했습니다. 저장된 데이터가 그대로이므로 예상된 결과입니다.

## 조사할 것

`image_urls`가 조립되어 products 행에 기록되는 지점(생성 API의 insert/update, `app/api/generate/route.ts:1686` / `:1716` 부근으로 추정)을 기준으로 거꾸로 올라가면서 확인해 주세요.

1. **DB 기록 직전에 배열을 통째로 로그**로 찍어 주세요:
   `[generate] image_urls n=<길이> unique=<고유수> urls=[...파일명만...]`
   이게 있으면 다음부터 이 문제를 30초 만에 판정할 수 있습니다.

2. 같은 URL이 여러 슬롯에 들어가는 경로를 찾으세요. 유력 후보 두 가지:
   - **업로드 소실 후 채움**: 업로드 5장 중 4장이 어떤 단계(컷아웃 품질 미달 폐기, enhance 타임아웃 등)에서 탈락하고, 빈 슬롯을 남은 1장으로 채우는 폴백이 있는지.
   - **애초에 업로드가 1장**: 글로위스트 v3는 v1·v2 재생성본이라 업로드 자체가 1장이었을 수도 있습니다. 이 경우 "슬롯 수를 맞추려고 같은 URL을 3번 push"하는 코드가 어디인지 찾으세요.

   어느 쪽인지 **업로드 원본 장수와 최종 고유 장수를 함께 로그**로 남겨 판정해 주세요:
   `[photo-pipeline] uploaded=<n> enhanced=<n> passthrough=<n> finalUnique=<n>`

3. 히알루론 세럼(`7dca0930-…`)은 9개 전부 고유합니다. 두 상품의 생성 경로 차이(업로드 장수, draft 재사용 여부, 카테고리 옵션)를 비교하면 분기점이 드러날 가능성이 높습니다.

## 작업 A — 저장 시점 중복 제거

`image_urls`를 기록하기 전에 **동일 URL 중복을 제거**하세요. 슬롯 수를 맞추려고 같은 URL을 반복해 넣는 동작은 없애고, 고유 URL만 저장합니다.

풀이 슬롯 수보다 적어지는 것은 정상 상태로 취급하세요 — 99차에서 이미 (a) 반복 상한·연속 회피 가드와 (b) 고유 사진 3장 이하일 때의 사용자 안내를 넣었으므로, 부족한 풀은 그쪽에서 자연스럽게 처리됩니다. **"같은 사진을 배열에 복제해 채우는 것"보다 "풀이 작다는 사실을 그대로 알리는 것"이 낫습니다.**

## 작업 B — 소실 경로 복구 (조사 결과가 "업로드 소실"인 경우에만)

조사 2에서 업로드가 실제로 5장이었는데 4장이 탈락한 것으로 확인되면, 탈락 사유별로 처리를 정하세요.

- enhance 실패/타임아웃 → **원본 업로드본을 그대로 배열에 넣기**(99차에서 이미 원본 폴백이 있다고 했으므로, 그 폴백이 실제로 배열까지 도달하는지 확인).
- 컷아웃 품질 미달로 폐기 → 폐기하더라도 **원본은 살려서** 넣기. 배경이 안 바뀐 원본이 같은 사진 반복보다 낫습니다.
- 탈락 건수는 반드시 로그로.

업로드가 애초에 1장이었던 것으로 확인되면 작업 B는 불필요합니다. 그 경우 작업 A와 99차 가드만으로 충분하며, 조사 결과를 리포트에 그대로 적어 주세요.

## 하지 않는 것

- 99차에서 넣은 배정 가드(round-robin·절반 상한·연속 회피·로그)를 되돌리지 마세요. 유효한 개선입니다.
- 부족한 컷을 생성형 이미지로 새로 만들어 채우는 것은 범위 밖입니다.
- 이미 저장된 과거 상품의 `image_urls`를 소급 수정하지 마세요.
- `TEST_MODE` / `IMAGE_ROUTER_ENABLED` 설정은 건드리지 마세요(사용자가 별도 판단 중).

## 검증 방법

DB 조회가 막혀 있었다고 하셨는데, **브라우저에서 로그인한 상태로 결과 페이지 콘솔에 아래를 붙여넣으면 조회됩니다** (실제로 이 방법으로 위 데이터를 얻었습니다). `PRODUCT_ID`만 바꿔 쓰세요.

```js
// 결과 페이지(로그인 상태) 콘솔에서 실행
const ANON = 'sb_publishable_rl3lsipOrpqhgA2f4I-_bQ_a_T4Kb5S';
const base = 'https://sblnthhayvrfkvaksest.supabase.co';
const PRODUCT_ID = '49f8192b-2d17-4650-adac-12941f86487a';
const ac = document.cookie.split('; ').map(c => c.split('=')).filter(([k]) => k.includes('auth-token'));
let j = decodeURIComponent(ac.sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>v).join(''));
if (j.startsWith('base64-')) j = atob(j.slice(7));
const token = JSON.parse(j).access_token;
const r = await (await fetch(`${base}/rest/v1/products?id=eq.${PRODUCT_ID}&select=id,image_urls`,
  { headers: { apikey: ANON, Authorization: `Bearer ${token}` } })).json();
const u = (r[0].image_urls || []).map(x => String(x).split('/').pop());
console.log({ n: u.length, unique: new Set(u).size, urls: u });
```

- `npx tsc --noEmit` 에러 0건.
- 사진 1장만 올려 신규 상품을 생성 → 저장된 `image_urls`에 **같은 URL이 두 번 이상 들어가지 않는지** 위 스니펫으로 확인.
- 사진 7장 올려 생성 → `unique`가 7 이상 유지되는지(히알루론 세럼 수준) 확인, 회귀 없는지 확인.
- `[generate] image_urls …` / `[photo-pipeline] uploaded=… finalUnique=…` 로그가 실제로 찍히는지 확인.

## 완료 보고 체크리스트

- [ ] DB 기록 직전 `image_urls` 로그 추가
- [ ] `[photo-pipeline] uploaded/enhanced/passthrough/finalUnique` 로그 추가
- [ ] 같은 URL이 여러 슬롯에 들어가는 지점 특정 (file:line으로 기록)
- [ ] 저장 시점 중복 제거
- [ ] (해당 시) 업로드 소실 경로에서 원본 폴백이 배열까지 도달하도록 수정
- [ ] 글로위스트 v3가 "업로드 소실"인지 "애초에 1장"인지 판정 결과 기록
- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 신규 생성 2건(1장 / 7장)으로 `unique` 실측 결과 기록
