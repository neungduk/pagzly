# 라이브 퍼징 보고 (449차)

사례 200개(시드 448) · 라이브 위반 41건 · 위반 사례 23개

| 종류 | 라이브 건수 | 라이브 사례 | export 건수(참고) | export 사례 |
|---|---|---|---|---|
| 예외 | 8 | 1 | - | - |
| 가로 넘침 | 12 | 3 | - | - |
| 잘린 글자 | 0 | 0 | - | - |
| 빈 섹션 껍데기 | 0 | 0 | - | - |
| R7 대비 | 21 | 21 | - | - |

## 종류별 대표 재현(최대 3개)
### 예외
- `fz051-makeup-tint` (모든 글 비움 + 가격 없음): 320px Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-uniqu
### 가로 넘침
- `fz053-tech-keyboard` (제품명 공백 + 제품명 공백): 320px +40
- `fz138-tech-vacuum` (섹션 절반 누락 + 제품명 특수문자 + 제품명 공백): 320px +40
- `fz155-living-storage` (제품명 공백 + 성분 비움 + 본문 글 변형): 320px +40
### R7 대비
- `fz003-fashion-bottom-denim` (히어로만 + 제품명 60자 이상): 390px 1곳 «데님 팬츠» 32px 1.06<3
- `fz032-tech-keyboard` (섹션 하나 누락): 390px 12곳 «KC 인증» 12px 1.00<4.5
- `fz034-tier-normal-fashion-3p` (제품명 60자 이상 + 브랜드 60자 이상): 390px 1곳 «코튼 셔츠» 32px 1.09<3
