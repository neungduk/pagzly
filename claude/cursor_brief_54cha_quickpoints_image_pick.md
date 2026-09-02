# 54차 — quick_points(컴팩트 96px) 이미지 선택 개선 (반려동물 블러 수정, 코드 전용)

생성: 2026-09-01

## 배경

53차에서 보고해주신 반려동물 "하루 1~2개" 섹션 블러 원인 진단을 코드로 다시 따라가
봤습니다. 정확한 원인 조합을 확인했고, 이번엔 낮은 리스크로 고칠 수 있는 지점을
찾았습니다.

`lib/photo-composite.ts`의 `featherCutout()`은 모든 이미지에 공용으로 쓰는 합성
파이프라인(`CANVAS_SIZE` 기준, 보통 1200px 안팎)이라 여기 블러 세기 자체를 낮추면
히어로 등 다른 큰 화면 합성 품질에 영향을 줄 수 있습니다. 그런데 문제의 실제 뿌리는
그게 아니라 **어떤 사진을 96px 컴팩트 슬롯에 배정하느냐**에 있었습니다.

`lib/assign-section-images.ts`의 `preferForSlot()`을 보면:

```ts
if (slot === "detail_zoom" || slot === "fabric_composition" || slot === "quick_points") {
  return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
}
```

`quick_points`(96×96 컴팩트 썸네일)가 `detail_zoom`/`fabric_composition`(둘 다 원래
크게 확대해서 보여주는 슬롯)과 같은 취급을 받아서 무조건 `"detail"` 역할 사진을
우선 배정받습니다. 반려동물·식품처럼 "detail" 역할 사진이 낱개 여러 개가 흩어진
매크로 컷(예: 트릿 여러 개)인 카테고리에서는, 그 사진의 컷아웃 경계가 아주 많고
복잡해서 `featherCutout`의 페더링이 크게 걸리고, 이게 96px로 축소되면서 전체가
뿌옇게 보이는 겁니다. `detail_zoom`처럼 원래 크게 보여주는 슬롯에서는 같은 사진도
문제가 덜한데, `quick_points`만 작게 나가면서 유독 도드라진 것으로 보입니다.

## 이번 라운드 원칙 — 비용 발생 없음

이번에도 코드 수정 + 무료 검증만 합니다. 새 AI 이미지 생성 호출은 필요 없고, 기존
사진 중에서 어떤 걸 배정하는지 우선순위만 바꾸는 작업입니다. 실제 유료 생성 재확인은
다음 승인 라운드로 미뤄주세요.

## 작업 A — quick_points를 detail_zoom/fabric_composition에서 분리

`quick_points`를 위 조건문에서 빼서 별도 분기로 만들고, **"package" 또는 "hero"
역할처럼 단일 피사체가 뚜렷한 사진을 먼저 시도**하고, 그런 사진이 없을 때만
`"detail"`로 폴백하도록 순서를 바꿔주세요:

```ts
if (slot === "detail_zoom" || slot === "fabric_composition") {
  return rolePrefer("detail", imageCount > 1 ? 1 : undefined);
}
if (slot === "quick_points") {
  return (
    rolePrefer("package") ??
    rolePrefer("hero", 0) ??
    rolePrefer("detail", imageCount > 1 ? 1 : undefined)
  );
}
```

(정확한 폴백 순서·`rolePrefer` 인자는 실제 타입/헬퍼 시그니처에 맞춰 조정하세요 —
핵심은 "컴팩트 96px 슬롯에는 낱개가 흩어진 매크로 컷보다 단일 피사체 사진을
우선한다"는 원칙입니다.)

## 작업 B — (선택, 시간 되면) 페더 상한을 컴팩트 컨텍스트에만 별도 적용

작업 A만으로 충분히 해결될 가능성이 높습니다. 다만 만약 특정 상품에 package/hero
역할 사진 자체가 없어서 여전히 detail 역할로 폴백되는 케이스가 있다면, 그때는
`featherCutout()` 자체를 건드리지 말고 — 별도로 96px 컴팩트 렌더링 경로에서만 살짝
더 강한 sharpen(예: `sharp().sharpen()`)을 한 번 더 얹는 정도로 국소적으로 보정하는
방법을 검토해주세요. 이건 전역 합성 파이프라인을 안 건드리는 선에서만 시도하고,
복잡해지면 이번 라운드에서는 스킵하고 다음으로 미뤄도 됩니다.

## 하지 않는 것

- `featherCutout()`의 전역 `blurSigma` 계산 로직 자체를 바꾸는 것 (다른 슬롯/히어로
  합성 품질에 영향 줄 수 있어 리스크가 큼)
- 새로운 유료 AI 이미지 생성 테스트 (다음 라운드로 이월)
- `detail_zoom`/`fabric_composition`의 기존 동작 변경

## 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 반려동물 카테고리처럼 "detail" 역할 사진이 낱개 매크로 컷인 케이스를 가정한
      로컬 시나리오에서, `quick_points` 슬롯이 이제 package/hero 역할을 우선
      집는지 코드/로그로 확인
- [ ] package/hero 역할이 아예 없는 상품(폴백 케이스)에서도 기존처럼 detail로
      정상 폴백되는지 확인 (회귀 없는지)
- [ ] 다른 카테고리(화장품/전자제품 등)에서 `quick_points` 배정이 기존과 달라져서
      오히려 안 좋아진 케이스는 없는지 간단히 확인

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, 위 체크리스트 결과. 이번엔 유료 생성 없이
코드 레벨 확인만으로 충분합니다 — 무리해서 스크린샷을 새로 뽑지 않아도 됩니다.
