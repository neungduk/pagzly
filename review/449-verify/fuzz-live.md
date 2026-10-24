# 라이브 퍼징 보고 (449차)

사례 200개(시드 448) · 라이브 위반 229건 · 위반 사례 128개

| 종류 | 라이브 건수 | 라이브 사례 | export 건수(참고) | export 사례 |
|---|---|---|---|---|
| 예외 | 96 | 13 | 0 | 0 |
| 가로 넘침 | 11 | 3 | 0 | 0 |
| 잘린 글자 | 0 | 0 | 0 | 0 |
| 빈 섹션 껍데기 | 0 | 0 | 3 | 1 |
| R7 대비 | 122 | 122 | 3 | 3 |

## 종류별 대표 재현(최대 3개)
### 예외
- `fz042-compare-beauty` (키워드 30개 + 모든 글 비움 + 이미지 0장): 320px Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-uniqu
- `fz050-living-storage` (본문 글 변형 + 섹션 5개만 + 이미지 0장): 320px An empty string ("") was passed to the %s attribute. This may cause the browser to download the whole page again over the network. To fix th
- `fz051-makeup-tint` (모든 글 비움 + 가격 없음): 320px Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-uniqu
### 가로 넘침
- `fz053-tech-keyboard` (제품명 공백 + 제품명 공백): 320px +40
- `fz138-tech-vacuum` (섹션 절반 누락 + 제품명 특수문자 + 제품명 공백): 320px +40
- `fz155-living-storage` (제품명 공백 + 성분 비움 + 본문 글 변형): 320px +40
### R7 대비
- `fz000-compare-beauty` (히어로 문구 3000자 + 이미지 20장 + 키워드 30개): 390px 15곳 «이 제품» 10px 1.90<4.5
- `fz001-compare-fashion` (이미지 20장 + 제품명 한영 혼합 + 제품명 60자 이상): 390px 6곳 «소재» 14px 2.42<4.5
- `fz002-compare-tech` (가격 없음 + 섹션 5개만 + 섹션 순서 섞기): 390px 8곳 «무게» 14px 2.35<4.5
