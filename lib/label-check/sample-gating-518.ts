/**
 * 518 — 정적 샘플 결과(sample-result-a.json)에도 513 게이팅을 적용한다.
 * 샘플 JSON은 513 이전 구조(직접 확인 5개)라서 그대로 보여 주면
 * 수출 전용·세트·색조가 옵션을 체크하지 않았는데도 "직접 확인"에 남는다.
 * 서버 run-check 경로(붙여넣기·파일·OCR)는 이미 gating-513을 거치므로 여기서는 샘플 전용.
 * 판정 로직은 건드리지 않고, 결과 객체의 manualItems/skippedItems513/referenceNotes513만 재배치한다.
 */
import type { LabelCheckInput, LabelCheckResult } from "@/lib/label-check/types";

const WHY_PREFIX = "왜 직접 봐야 하나요: ";

const EXPORT_NOTICE =
  "수출 전용은 한국 표시 규정 대신 수출국 기준을 따르기 때문에 한국 기준 점검을 줄였어요";

type Manual = LabelCheckResult["manualItems"][number] & { whyManual?: string };

const REVISION_LABEL = "주의사항·알레르기 유발성분 표시 규정 개정안";
const EXPORT_LABEL = "수출 전용 제품";
const SET_LABELS = ["세트 상품 제조번호·사용기한 표기", "세트 상품 표시"];
const COLOR_LABELS = ["색조 제품 착색제 ± 표기"];
const INCI_LABEL = "표준 국문 성분명 사용";

function has(input: Pick<LabelCheckInput, "productTypes">, id: string): boolean {
  return (input.productTypes || []).includes(id);
}

export function applyGatingToStaticResult518(
  result: LabelCheckResult,
  input: Pick<LabelCheckInput, "productTypes">,
): LabelCheckResult {
  const skipped: NonNullable<LabelCheckResult["skippedItems513"]> = [...(result.skippedItems513 || [])];
  const notes: NonNullable<LabelCheckResult["referenceNotes513"]> = [...(result.referenceNotes513 || [])];
  const addSkip = (label: string, reason: string) => {
    if (!skipped.some((s) => s.label === label)) skipped.push({ label, reason });
  };
  const addNote = (label: string, text: string) => {
    if (!notes.some((n) => n.label === label)) notes.push({ label, text });
  };

  // 수출 전용 — 선택했으면 한국 기준 점검을 줄인다(run-check와 같은 동작)
  if (has(input, "export_only")) {
    addNote(REVISION_LABEL, "확정·시행 동향은 참고용입니다. 판정에 쓰지 않습니다.");
    return {
      ...result,
      findings: [],
      manualItems: [],
      summary: { ...result.summary, possible: 0, attention: 0, unknown: 0, pass: 0, manual: 0 },
      skippedItems513: [
        { label: "한국 표시 규칙 전반", reason: "수출 전용으로 선택해 한국 기준 점검을 줄였어요" },
      ],
      referenceNotes513: notes,
      exportNotice513: EXPORT_NOTICE,
      fixSheet: undefined,
    };
  }

  const kept: Manual[] = [];
  for (const m of (result.manualItems || []) as Manual[]) {
    if (m.label === EXPORT_LABEL) {
      addSkip(
        EXPORT_LABEL,
        "수출 전용으로 선택하지 않아 점검하지 않았어요. 해당하면 제품 정보에서 '수출 전용'을 체크하세요.",
      );
      continue;
    }
    if (m.label === REVISION_LABEL) {
      addNote(REVISION_LABEL, "개정·시행 동향 안내입니다. 확정 전까지 판정에 쓰지 않습니다.");
      continue;
    }
    if (SET_LABELS.includes(m.label)) {
      if (has(input, "set_product")) {
        kept.push({
          ...m,
          whyManual: m.whyManual || WHY_PREFIX + "세트 구성별 표기는 사진만으로 구별하기 어려워요",
        });
      } else {
        addSkip(m.label, "세트 상품 표시가 없어 점검하지 않았어요");
      }
      continue;
    }
    if (COLOR_LABELS.includes(m.label)) {
      if (has(input, "color_makeup")) {
        kept.push({
          ...m,
          whyManual: m.whyManual || WHY_PREFIX + "색상별 착색제 표기는 사진만으로 구별하기 어려워요",
        });
      } else {
        addSkip(m.label, "색조·착색제 단서가 없어 점검하지 않았어요");
      }
      continue;
    }
    if (m.label === INCI_LABEL) {
      kept.push({
        ...m,
        suggest:
          !m.suggest || m.suggest === "수동 확인이 필요합니다."
            ? "전성분 표준 국문명이 맞는지 협회 성분사전 등으로 확인하세요."
            : m.suggest,
        whyManual:
          m.whyManual || WHY_PREFIX + "표준 국문명 사전이 없어 정확성은 서비스가 판정하지 않아요",
      });
      continue;
    }
    kept.push(m);
  }

  return {
    ...result,
    manualItems: kept,
    summary: { ...result.summary, manual: kept.length },
    skippedItems513: skipped.length ? skipped : result.skippedItems513,
    referenceNotes513: notes.length ? notes : result.referenceNotes513,
  };
}
