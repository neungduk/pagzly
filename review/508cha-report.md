# 508차 보고서

## 확인하지 못한 항목
- **실제 Google Vision 호출·실사진/캡처 PDF 정확도** — 금지(fixture·가짜 fetch만). Production 키 검증은 사용자 담당.
- 브라우저 실측(320/390, 타일 렌더, 복사·포커스) — **미실시**.
- Supabase 마이그레이션 **적용 안 함**(파일만 추가). RPC 실동작 미확인.
- 회원 `/label-check/new` OCR 확인 화면은 게스트와 동일 수준으로 완전 복제하지 않음(이미지 수신·붙여넣기 CTA 위주).

## 파트 A 전/후 상태표

| 상태 | 전(507) | 후(508) |
|---|---|---|
| 글자 0·거의 없음 | `skipJudgment` + 결론 **"발견된 항목이 없어요"** 위험 | `readStatus:unreadable` · 제목 **"글자를 읽지 못해 점검하지 못했어요"** · 점수칸·초록 금지 · OCR/붙여넣기 CTA |
| 혼합 쪽 | emptyPages 안내만 | `partial` 노란 배너 + 빈결과 시 **"읽은 부분에서는 발견된 항목이 없어요"** |
| 정상 | 기존 | `ok` 기존 유지 |
| 붙여넣기 짧은 광고 | (동일 판정) | `extractSource:text` — 짧은 문구도 점검(파일 unreadable 규칙과 분리) |

### "발견된 항목이 없어요"가 나오는 경로
1. `readStatus=ok`(또는 미설정)이고 고칠/확인할 것 0건인 정상 빈결과.
2. (금지) unreadable에서는 나오지 않음 — `buildVerdict507` 가드.
3. partial 빈결과는 **"읽은 부분에서는…"** 로 대체.

## OCR 흐름(텍스트)
```
파일(PDF/JPG/PNG/WEBP)
  → 클라: 리사이즈·세로 타일(2400+120겹침, ≤20)
  → POST /api/label-check/ocr (≤4MB 배치, 월 consume 후 Vision)
  → 줄 병합·정규화 → 고객 확인 화면
  → "이 글자로 점검" = text full + ocrFromPhoto
  → runLabelCheckFromExtracted (sizePt 미상→unknown)
```

## 환경변수
| 이름 | 기본 | 역할 |
|---|---|---|
| `GOOGLE_VISION_API_KEY` | (없음=OCR 꺼짐) | Vision REST |
| `LABEL_OCR_MONTHLY_LIMIT` | 900 | 월 조각 상한 |
| `LABEL_OCR_PER_USER_DAILY` | 30(회원)/5(비회원) | 일일(인메모리·약한 보호) |

## 비용식
- 요청당 최대 조각 20 · 본문 배치 ≤4MB · 동시 Vision 4.
- 과금: 조각 수 × (1,000장당 US$1.50), 월 1,000장 무료(공식 가격 페이지 확인값, 변동 가능).

## 마이그레이션
- `supabase/migrations/20261110100000_label_ocr_usage.sql` — **적용하지 않음**(사용자 적용).
- 개인정보 항목 목록: `review/508-privacy-note.md` (`/privacy` 미수정).

## 검증
- `npx tsc --noEmit` / `npm run build` / `regression:label-check` **19/19**
- push: `cloud-work` only

## 커밋·push
- 브랜치: `cloud-work` only (main 미push)
- `3805854` docs targets
- `f2e95b1` feat unreadable/partial
- `8903845` feat OCR API/core
- `623a3fd` feat client UI
- `a7a0990` test suites
- `93b9ce8` docs report — tip (push 확인)
