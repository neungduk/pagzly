/**
 * 513 — 해당 여부 감지 → 코드 판정 / 숨김 / 판매자 확인.
 * run-check·run-check-us에서 호출. 규칙 JSON은 수정하지 않음.
 */
import type { ExtractedPdf } from "@/lib/label-check/extract-pdf";
import {
  checkColorantPlusMinus513,
  checkFunctionalSize513,
  checkLotExpiryDistinct513,
  checkNeutralizerGuide513,
  checkOtherIngredient513,
  checkSetProduct513,
  checkStandardKoreanInci513,
  checkUsEnglish513,
  checkUsHazardWarning513,
  checkUsProductName513,
  checkUsProfessional513,
  checkUsSafetyWarning513,
  detectColorMakeup513,
  detectFunctionalPhrase513,
  detectHazardousUs513,
  detectNeutralizerOrSoap513,
  detectOtherIngredientPhrase513,
  detectProfessionalUs513,
  detectSetProduct513,
  hasProductType513,
} from "@/lib/label-check/checks-513";
import type { Finding, LabelCheckInput, LabelCheckResult } from "@/lib/label-check/types";

export type SkippedItem513 = { label: string; reason: string };
export type ReferenceNote513 = { label: string; text: string };
export type ManualItem513 = LabelCheckResult["manualItems"][number] & {
  whyManual?: string;
};

export type GatingBundle513 = {
  findings: Finding[];
  manualItems: ManualItem513[];
  skippedItems513: SkippedItem513[];
  referenceNotes513: ReferenceNote513[];
  exportNotice513?: string;
};

const EXPORT_NOTICE_513 =
  "수출 전용은 한국 표시 규정 대신 수출국 기준을 따르기 때문에 한국 기준 점검을 줄였어요";

const WHY_PREFIX = "왜 직접 봐야 하나요: ";

/** addenda·규칙에서 넘어온 구(舊) 수동 항목 — 게이팅이 대체 */
const KR_GATED_MANUAL_LABELS = new Set([
  "수출 전용 제품",
  "주의사항·알레르기 유발성분 표시 규정 개정안",
  "세트 상품 제조번호·사용기한 표기",
  "색조 제품 착색제 ± 표기",
  "표준 국문 성분명 사용",
  "제조번호와 사용기한 구별 표시",
  "중화·비누화 생성물 표기, 기타 성분",
  "기능성화장품 문구 위치·크기",
  "세트 상품 표시",
]);

const US_GATED_MANUAL_IDS = new Set([
  "US-001",
  "US-007",
  "US-008",
  "US-009",
  "US-011",
  "US-012",
]);

function pushSkip(list: SkippedItem513[], label: string, reason: string) {
  if (list.some((s) => s.label === label)) return;
  list.push({ label, reason });
}

function manualWhy(label: string, why: string, suggest: string, extra?: Partial<ManualItem513>): ManualItem513 {
  return {
    category: "판매자 확인",
    label,
    suggest,
    whyManual: WHY_PREFIX + why,
    ...extra,
  };
}

/** 입력 옵션 정규화(US hazardous/professional ↔ productTypes) */
export function normalizeInputFlags513(input: LabelCheckInput): LabelCheckInput {
  const types = input.productTypes || [];
  return {
    ...input,
    professionalUse:
      Boolean(input.professionalUse) || types.includes("professional"),
    hazardous:
      Boolean(input.hazardous) ||
      types.includes("hazardous") ||
      types.includes("aerosol"),
    functional: Boolean(input.functional) || types.includes("functional"),
  };
}

/**
 * 한국: 기존 findings + (규칙/addenda가 넣은) manuals를 받아
 * 게이팅 적용 결과를 돌려준다.
 */
export function applyKrGating513(args: {
  text: string;
  extracted: ExtractedPdf;
  input: LabelCheckInput;
  findings: Finding[];
  manualItems: LabelCheckResult["manualItems"];
}): GatingBundle513 {
  const input = normalizeInputFlags513(args.input);
  const text = args.text;
  const skipped: SkippedItem513[] = [];
  const notes: ReferenceNote513[] = [];
  const manuals: ManualItem513[] = [];
  let findings = [...args.findings];

  // 수출 전용: 한국 규칙 축소
  if (hasProductType513(input, "export_only")) {
    return {
      findings: [],
      manualItems: [],
      skippedItems513: [
        {
          label: "한국 표시 규칙 전반",
          reason: "수출 전용으로 선택해 한국 기준 점검을 줄였어요",
        },
      ],
      referenceNotes513: [
        {
          label: "주의사항·알레르기 유발성분 표시 규정 개정안",
          text: "확정·시행 동향은 참고용입니다. 판정에 쓰지 않습니다.",
        },
      ],
      exportNotice513: EXPORT_NOTICE_513,
    };
  }

  // 기존 수동 중 게이팅 대상 제거(나머지는 보존 — 보통 없음)
  for (const m of args.manualItems) {
    if (KR_GATED_MANUAL_LABELS.has(m.label)) continue;
    manuals.push({ ...m });
  }

  // 중복 라벨 findings 정리(513이 담당하는 항목)
  const replaceLabels = new Set([
    "표준 국문 성분명 확인",
    "표준 국문 성분명 사용",
    "기타 성분 표기",
    "세트 상품 제조번호·사용기한 표기",
    "색조 제품 착색제 ± 표기",
    "제조번호와 사용기한 구별 표시",
    "중화·비누화 생성물 표기",
    "기능성화장품 문구 위치·크기",
  ]);
  findings = findings.filter((f) => !replaceLabels.has(f.label));

  // PEND → 참고
  notes.push({
    label: "주의사항·알레르기 유발성분 표시 규정 개정안",
    text: "개정·시행 동향 안내입니다. 확정 전까지 판정에 쓰지 않습니다.",
  });

  // 수출 전용(옵션 없음) → 목록에서 제거·스킵 안내
  pushSkip(
    skipped,
    "수출 전용 제품",
    "수출 전용으로 선택하지 않아 점검하지 않았어요. 해당하면 제품 정보에서 '수출 전용'을 체크하세요.",
  );

  // 세트
  if (detectSetProduct513(text, input)) {
    findings.push(checkSetProduct513(text));
  } else {
    pushSkip(
      skipped,
      "세트 상품 제조번호·사용기한 표기",
      "세트 상품 표시가 없어 점검하지 않았어요",
    );
    pushSkip(skipped, "세트 상품 표시", "세트 상품 표시가 없어 점검하지 않았어요");
  }

  // 색조 ±
  if (detectColorMakeup513(text, input)) {
    findings.push(checkColorantPlusMinus513(text));
  } else {
    pushSkip(
      skipped,
      "색조 제품 착색제 ± 표기",
      "색조·착색제 단서가 없어 점검하지 않았어요",
    );
  }

  // 제조번호·사용기한 구별 — 항상
  findings.push(checkLotExpiryDistinct513(text));

  // 중화·비누화
  if (detectNeutralizerOrSoap513(text, input)) {
    findings.push(checkNeutralizerGuide513(text));
  } else {
    pushSkip(
      skipped,
      "중화·비누화 생성물 표기",
      "중화제·비누화 단서가 없어 점검하지 않았어요",
    );
  }

  // 기타 성분
  if (detectOtherIngredientPhrase513(text)) {
    findings.push(checkOtherIngredient513(text));
  } else {
    pushSkip(
      skipped,
      "기타 성분 표기",
      "전성분에 '기타 성분' 문구가 없어 점검하지 않았어요",
    );
  }

  // 기능성 문구 크기 + 위치는 manual
  if (detectFunctionalPhrase513(text, input)) {
    findings.push(checkFunctionalSize513(text, args.extracted));
    manuals.push(
      manualWhy(
        "기능성화장품 문구 위치",
        "글자 위치(바로 아래 여부) 정보가 없어요",
        "기능성화장품 글자 바로 아래에 같은 크기 이상 문구가 있는지 인쇄본에서 확인하세요.",
      ),
    );
  } else {
    pushSkip(
      skipped,
      "기능성화장품 문구 위치·크기",
      "기능성화장품 단서가 없어 점검하지 않았어요",
    );
  }

  // 표준 국문 성분명
  const inci = checkStandardKoreanInci513(text);
  if (inci.finding) findings.push(inci.finding);
  manuals.push(
    manualWhy(
      "표준 국문 성분명 사용",
      "표준 국문명 사전이 없어 정확성은 서비스가 판정하지 않아요",
      inci.englishOnlyCount
        ? `영문만 있는 성분 ${inci.englishOnlyCount}개를 표준 국문명과 맞춰 보세요.`
        : "전성분 표준 국문명이 맞는지 협회 성분사전 등으로 확인하세요.",
    ),
  );

  return {
    findings,
    manualItems: manuals,
    skippedItems513: skipped,
    referenceNotes513: notes,
  };
}

export function applyUsGating513(args: {
  text: string;
  extracted: ExtractedPdf;
  input: LabelCheckInput;
  findings: Finding[];
  /** 규칙 루프가 넣으려던 manual — 게이팅이 대체 */
  pendingManualRules: Array<{
    id: string;
    title: string;
    requirement: string;
    lookFor: string[];
    failStatus: Finding["status"];
    fixKo?: string;
    fixExampleEn?: string;
  }>;
}): GatingBundle513 {
  const input = normalizeInputFlags513(args.input);
  const text = args.text;
  const skipped: SkippedItem513[] = [];
  const notes: ReferenceNote513[] = [];
  const manuals: ManualItem513[] = [];
  let findings = [...args.findings].filter(
    (f) => f.label !== "영어 표기" && f.checkKey !== "US-007" && f.checkKey !== "US-001",
  );

  // US-001
  findings.push(checkUsProductName513(args.extracted));

  // US-007 — 코드 경로에서 이미 넣었을 수 있음 → 교체
  findings.push(checkUsEnglish513(text, "possible"));

  // US-008
  {
    const r = checkUsSafetyWarning513(text);
    if (r === "manual") {
      manuals.push(
        manualWhy(
          "안전성 미입증 경고",
          "안전성 근거 자료는 서비스가 알 수 없어요",
          "안전성이 입증되지 않았다면 해당 영문 경고 문구가 필요한지 확인하세요.",
        ),
      );
    } else {
      findings.push(r);
    }
  }

  // US-009
  if (detectHazardousUs513(text, input)) {
    const look =
      args.pendingManualRules.find((r) => r.id === "US-009")?.lookFor || [];
    findings.push(checkUsHazardWarning513(text, look));
  } else {
    pushSkip(
      skipped,
      "위험 제품 경고(에어로졸 등)",
      "에어로졸·위험 제품 단서가 없어 점검하지 않았어요",
    );
  }

  // US-011
  if (detectProfessionalUs513(text, input)) {
    const look =
      args.pendingManualRules.find((r) => r.id === "US-011")?.lookFor || [];
    findings.push(checkUsProfessional513(text, look));
  } else {
    pushSkip(
      skipped,
      "전문가용 제품 표기(MoCRA)",
      "전문가용 단서가 없어 점검하지 않았어요",
    );
  }

  // US-012 → 참고
  notes.push({
    label: "향료 알레르기 성분(MoCRA, 규칙 미확정)",
    text: "MoCRA 향료 알레르기 성분 규칙은 아직 미확정입니다. 동향만 참고하세요.",
  });

  // 기타 pending(게이팅 외) — 거의 없음
  for (const r of args.pendingManualRules) {
    if (US_GATED_MANUAL_IDS.has(r.id)) continue;
    manuals.push({
      category: "US",
      label: r.title,
      suggest: "확인 필요 질문: " + (r.requirement || "해당 항목을 확인하세요."),
      fixSuggestion: r.fixKo,
      fixExample: r.fixExampleEn,
    });
  }

  return {
    findings,
    manualItems: manuals,
    skippedItems513: skipped,
    referenceNotes513: notes,
  };
}

export { EXPORT_NOTICE_513, WHY_PREFIX, KR_GATED_MANUAL_LABELS };
