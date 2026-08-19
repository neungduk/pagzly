# 배경·합성 촬영 프롬프트 템플릿

추상어("촉촉하게", "고급스럽게")를 쓰지 않는다.  
조명·구도·질감을 **촬영 용어**로 고정하고, flux-fill-dev / flux-schnell 프롬프트에 그대로 넣는다.

코드 소스: `lib/backdrop-prompt-templates.ts`  
주입: `lib/concept-brief.ts` `formatConceptPromptBlock`, `lib/photo-enhance.ts` `generateBackdrop`

브랜드 카피·모델컷은 베끼지 않는다. 촬영 문법만 참고한다.

## 공통

- 조명: soft side lighting / diffused light
- 구도: shallow depth of field, empty center (상품이 올라갈 자리), close-up of the surface
- 금지: product, packaging, text, logo, letters

## 컨셉별

| 컨셉 | 조명 | 구도 | 질감 |
|------|------|------|------|
| 수분/보습 | 부드러운 측면광, 확산된 창광, 젖은 면 스펙큘러 | 얕은 피사계심도, 클로즈업 평면 | 유리 결로 물방울, 대리석 위 이슬, 과하지 않은 웻 쉰 |
| 진정/쿨링 | 쿨 확산광, 하이키, 시안 바운스. 텅스텐/골드 금지 | 여백 많은 클로즈업 | 공기 중 미세 미스트, 프로스티드 글라스 |
| 영양/농축 | 통제된 웜 바운스 + 확산 키 | 보틀이 들어갈 중앙 3분의 1을 비움 | 크리미 새틴, 골드 오일 스펙큘러 |
| 클렌징 | 밝은 확산 하이키 | 깨끗한 세라믹 평면 | 가장자리 소프트 거품, 비누막 하이라이트 |

환경변수 `BACKDROP_CANDIDATES`(기본 7, 권장 5–7)로 후보 장수만 조절한다.  
최종 승인(`TEST_MODE=false`)에서는 Claude `pickBestBackdrop`를 호출하지 않고 사람이 고른다.
