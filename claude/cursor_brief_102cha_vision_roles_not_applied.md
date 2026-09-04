# 102차 — Vision 역할 판정이 저장값에 반영되지 않음 (100차 작업 A 미동작)

생성: 2026-09-03
전제: TEST_MODE=false / IMAGE_ROUTER_ENABLED=true 상태에서 실제 비용을 들여 신규 상품을 생성하고 결과를 실측했습니다. 상품 `a4e33e41-2348-40b6-b6b8-2536ce17ac3e` ("글로위스트 드림글로우 카멜리아 에센스 미스트", 실제 제품 사진 9장 업로드, AI 비용 $0.3597).

**99차·100차 B/C의 효과는 실측으로 확인됐습니다** (아래 "정상 확인" 참고). 다만 **100차 작업 A(Vision 역할 자동 분류)만 실제로는 걸리지 않았습니다.**

## 확인된 문제

사진 9장을 올리면서 **폼의 역할 드롭다운은 일부러 하나도 건드리지 않았습니다.** 우선순위가 "사용자 지정 > Vision > 순서 기본값"이므로, 사용자 지정이 없으면 Vision 판정이 들어가야 합니다.

생성 후 DB에 저장된 값:

```
image_roles = ["hero","detail","lifestyle","package","other","other","other","other","other",
               "lifestyle","lifestyle","lifestyle"]
                ^^^^^^^^^^^^ 앞 9개 = 업로드한 사진
```

앞 9개가 `lib/image-roles.ts:122-128` `defaultRoleForIndex`의 출력과 **완전히 동일**합니다(0=hero, 1=detail, 2=lifestyle, 3=package, 나머지 other). 뒤 3개는 AI가 생성한 라이프스타일 컷이 뒤에 붙은 것으로 정상입니다.

실제 사진 내용과 대조하면 Vision이 돌았다면 나올 수 없는 결과입니다:

| 업로드 순서 | 실제 사진 내용 | 저장된 역할 | 맞는 역할 |
|---|---|---|---|
| 3번 | 병을 **옆으로 눕힌 단독 제품컷** (인물 없음) | `lifestyle` | detail |
| 5번 | **병 + 흰색 패키지 박스** 정면 | `other` | package |

3번은 사람도 사용 장면도 없는데 `lifestyle`, 5번은 박스가 명확히 보이는데 `other`입니다. 즉 Vision 판정이 아예 반영되지 않고 순서 기본값이 그대로 저장됐습니다.

**추가로 오해 소지가 있는 표시**: 결과 페이지의 생성 단계 카드가 "이미지 분석 완료 — **Vision 분석 반영**"이라고 표시합니다. 서술형 `image_analysis`는 저장됐지만 역할 배열에는 반영이 안 된 상태라, 이 문구는 사실과 다릅니다.

## 조사할 것

1. `analyzeImagesWithClaude`가 실제로 `roles` 배열을 반환하고 있는지 — 응답 원문을 로그로 찍어 확인해 주세요. (JSON 파싱 실패 시 조용히 빈 배열로 떨어지고 있을 가능성)
2. 100차에서 추가한 `[image-roles] vision=[…] user=[…] final=[…]` 로그가 이번 생성에서 실제로 찍혔는지 확인해 주세요. **안 찍혔다면 코드 경로 자체를 안 타는 것**이고, 찍혔는데 `vision=[]`이면 (1)번 문제입니다.
3. **draft→final 경로 유실 가능성이 가장 유력합니다.** 100차 리포트에 "draft→final에 `imageAnalysis` / `visionImageRoles` / `imageRoleUserSet` 전달"이라고 되어 있는데, 이번 생성은 폼 → **draft 승인** → final 순서로 진행됐습니다. `useDraftSections=true` 경로에서 `visionImageRoles`가 실제로 final까지 넘어와 `normalizeImageRoles`에 주입되는지 끝까지 따라가 주세요. 100차 작업 C에서 `imageAnalysis`가 정확히 이 경로에서 빈 문자열로 새던 것과 같은 함정일 가능성이 높습니다.
4. `confidence` 임계값(0.5) 때문에 전부 탈락한 것은 아닌지도 같이 확인해 주세요.

## 작업

원인을 확정한 뒤 Vision 판정이 `image_roles`에 실제로 반영되도록 고쳐 주세요. 사용자가 드롭다운을 직접 만진 인덱스는 절대 덮어쓰지 않는 우선순위는 그대로 유지합니다.

그리고 생성 단계 카드의 "Vision 분석 반영" 문구는 **역할 배열에 실제로 Vision 판정이 들어간 경우에만** 표시되도록 조건을 걸어 주세요. 지금은 서술형 분석만 있어도 뜹니다.

## 정상 확인된 것 (되돌리지 마세요)

같은 생성에서 아래는 실측으로 정상 동작을 확인했습니다.

- **이미지 다양성 (99차)**: 렌더링된 `<img>` 54개 중 **고유 20개, 최다 반복 4회**. 직전 글로위스트 v3는 고유 4개 / 최다 반복 30회였습니다. `image_urls`도 16개 전부 고유합니다.
- **AI 사용샷**: `…-lifestyle-ai-1.png`, `…-lifestyle-ai-2.png`가 실제로 생성되어 페이지에 들어갔습니다. 인물 사진을 따로 올리지 않았는데도 나왔습니다.
- **변형 팬아웃 (100차 B)**: `-enhanced`, `-ingredient`, `-fx-moisture`, `compare-before/after`, `illustration-11`, `checklist-2`, `specTable-4/8` 등 파생·아이콘·인포그래픽이 모두 생성됐습니다.
- **생성 단계 표시 (100차 C)**: **4/4단계 완료**로 정상 표시됩니다(톤앤매너 `#9EB7CB`, 25개 섹션). 1/4 버그 해결.
- **97차 라벨 환각 방지**: 배경 합성 후보에서 제품 라벨이 실제 그대로("Dream Glow / Camellia Essence Mist / glowiest") 유지됐고 가짜 브랜드명이 없습니다.
- **비용 분해**: 총 $0.3597 (이미지 $0.2034 — 배경 $0.0800 · 섹션배경 $0.0030 · 보정 $0.0373 · 카피 $0.0663 · 조립 $0.1563).

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- 사진 순서를 일부러 뒤섞어(1번에 박스컷, 4번에 정면컷) 신규 생성 후, 드롭다운을 **건드리지 않은 상태에서** 저장된 `image_roles`가 순서 기본값과 달라지는지 확인. 아래 스니펫으로 실측합니다(결과 페이지 콘솔, 로그인 상태).

```js
const ANON='sb_publishable_rl3lsipOrpqhgA2f4I-_bQ_a_T4Kb5S', base='https://sblnthhayvrfkvaksest.supabase.co';
const PRODUCT_ID='<신규 상품 id>';
const ac=document.cookie.split('; ').map(c=>c.split('=')).filter(([k])=>k.includes('auth-token'));
let j=decodeURIComponent(ac.sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>v).join(''));
if(j.startsWith('base64-')) j=atob(j.slice(7));
const token=JSON.parse(j).access_token;
const r=await (await fetch(`${base}/rest/v1/products?id=eq.${PRODUCT_ID}&select=image_roles`,
  {headers:{apikey:ANON,Authorization:`Bearer ${token}`}})).json();
console.log(r[0].image_roles);
```

- 드롭다운을 직접 지정한 인덱스는 그 값이 그대로 저장되는지 확인.
- `[image-roles]` 로그가 실제로 출력되는지 확인.

## 완료 보고 체크리스트

- [ ] Vision 응답에 `roles`가 실제로 담기는지 확인 (원문 로그)
- [ ] `[image-roles]` 로그 출력 여부 확인 → 코드 경로 미진입인지 판정
- [ ] draft→final 경로에서 `visionImageRoles` 유실 여부 확인 (가장 유력)
- [ ] confidence 임계값으로 전부 탈락한 것은 아닌지 확인
- [ ] 원인 수정 + 사용자 지정 우선순위 유지
- [ ] "Vision 분석 반영" 표시를 실제 반영된 경우로 한정
- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 사진 순서 뒤섞기 재현 테스트 결과 기록
