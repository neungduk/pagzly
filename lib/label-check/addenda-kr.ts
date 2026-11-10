/**
 * 504 — 별표4 보강(kr-label-addenda). 기존 KR-LBL과 중복 없이 통합.
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";
import type { Finding, LabelCheckInput, LabelCheckResult } from "@/lib/label-check/types";

export type Addendum = {
  id: string;
  ref?: string;
  title: string;
  rule: string;
  check_type: "code" | "manual" | string;
  looks_for?: string[];
  status_if_missing?: string;
  fix_ko?: string;
};

type AddendaFile = { addenda?: Addendum[] };

/** 보고서용: 기존 규칙과 중복·보강 관계 */
export const ADDENDA_OVERLAP_504: Array<{
  id: string;
  overlaps: string;
  action: "enhance" | "manual" | "soft" | "new-check";
}> = [
  { id: "KR-ADD-001", overlaps: "KR-LBL-006(개봉 후·제조연월일)", action: "new-check" },
  { id: "KR-ADD-002", overlaps: "KR-LBL-005(제조번호 구별)", action: "manual" },
  { id: "KR-ADD-003", overlaps: "KR-LBL-006(사용기한 표기)", action: "enhance" },
  { id: "KR-ADD-004", overlaps: "KR-LBL-003(용량) — 비누 입력 없음", action: "soft" },
  { id: "KR-ADD-005", overlaps: "KR-LBL-002(영업자)", action: "enhance" },
  { id: "KR-ADD-006", overlaps: "KR-LBL-014(수입 제조국)", action: "enhance" },
  { id: "KR-ADD-007", overlaps: "KR-LBL-020(전성분 5pt)", action: "enhance" },
  { id: "KR-ADD-008", overlaps: "KR-LBL-021(향료·알레르기)", action: "enhance" },
  { id: "KR-ADD-009", overlaps: "없음(수동)", action: "manual" },
  { id: "KR-ADD-010", overlaps: "기능성 표시(수동)", action: "manual" },
  { id: "KR-ADD-011", overlaps: "세트 상품(수동)", action: "manual" },
];

let cached: Addendum[] | null = null;

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "review", "data", ...parts);
}

export function loadKrAddenda504(): Addendum[] {
  if (cached) return cached;
  const raw = fs.readFileSync(dataPath("kr-label-addenda_draft_v0.1.json"), "utf8");
  const parsed = JSON.parse(raw) as AddendaFile;
  cached = parsed.addenda || [];
  return cached;
}

function enhanceFinding(f: Finding, fixKo: string | undefined): Finding {
  if (!fixKo?.trim()) return f;
  if (f.fixSuggestion?.trim()) return f;
  return { ...f, fixSuggestion: fixKo.trim(), fixKind: f.fixKind || "fix" };
}

/**
 * code 보강: 중복 항목은 기존 finding에 fix만 보강.
 * ADD-001만 별도 코드 판정(개봉 후 있는데 제조연월일 없음).
 * ADD-004는 비누/건조중량 문구 안내 수준.
 */
export function applyKrAddenda504(
  text: string,
  input: LabelCheckInput,
  findings: Finding[],
  manualItems: LabelCheckResult["manualItems"],
): { findings: Finding[]; manualItems: LabelCheckResult["manualItems"] } {
  const addenda = loadKrAddenda504();
  const byId = new Map(addenda.map((a) => [a.id, a]));
  const norm = normalizeLabelText(text);
  let next = [...findings];
  const manuals = [...manualItems];

  // ADD-001: 개봉 후 사용기간 있는데 제조연월일·제조일 없음
  {
    const a = byId.get("KR-ADD-001");
    if (a) {
      const hasPaO = /개봉후사용기간|개봉\s*후\s*사용기간/.test(norm);
      const hasMfg = /제조연월일|제조일/.test(norm);
      if (hasPaO && !hasMfg) {
        next.push({
          category: "표시사항",
          label: a.title,
          status: "attention",
          found: "개봉 후 사용기간 표기 확인, 제조연월일 병기 없음",
          suggest: a.fix_ko || "개봉 후 사용기간을 쓸 때 제조연월일도 함께 표시하세요.",
          checkType: "code",
          fixSuggestion: a.fix_ko,
          fixKind: "fix",
        });
      }
    }
  }

  // ADD-003: 사용기한 통과 finding에 표기 방식 fix 보강
  {
    const a = byId.get("KR-ADD-003");
    if (a) {
      next = next.map((f) =>
        f.label.includes("사용기한") ? enhanceFinding(f, a.fix_ko) : f,
      );
    }
  }

  // ADD-004: 건조중량 있으면 통과 안내만 / 없으면 비누면 안내(입력 없음 → soft)
  {
    const a = byId.get("KR-ADD-004");
    if (a) {
      if (/건조중량/.test(norm)) {
        // 문구 존재 → 추가 finding 없음(통과로 간주)
      } else if (/비누/.test(norm)) {
        next.push({
          category: "표시사항",
          label: a.title,
          status: "attention",
          found: "비누 관련 표기 가능",
          suggest: "비누 제품이면 수분 포함 중량과 건조중량을 함께 표시하세요.",
          checkType: "code",
          fixSuggestion: a.fix_ko,
          fixKind: "fix",
        });
      }
    }
  }

  // ADD-005: 영업자 finding 보강
  {
    const a = byId.get("KR-ADD-005");
    if (a) {
      next = next.map((f) =>
        f.label.includes("영업자") || f.label.includes("상호")
          ? enhanceFinding(f, a.fix_ko)
          : f,
      );
    }
  }

  // ADD-006: 수입 체크 시 제조국 finding 보강
  {
    const a = byId.get("KR-ADD-006");
    if (a && input.imported) {
      next = next.map((f) =>
        f.label.includes("제조국") || f.label.includes("수입")
          ? enhanceFinding(f, a.fix_ko)
          : f,
      );
    }
  }

  // ADD-007: 전성분 표시 방법 finding 보강
  {
    const a = byId.get("KR-ADD-007");
    if (a) {
      next = next.map((f) =>
        f.label.includes("전성분 표시 방법") ? enhanceFinding(f, a.fix_ko) : f,
      );
    }
  }

  // ADD-008: 알레르기 finding 보강
  {
    const a = byId.get("KR-ADD-008");
    if (a) {
      next = next.map((f) =>
        f.label.includes("알레르기") ? enhanceFinding(f, a.fix_ko) : f,
      );
    }
  }

  // 513 — KR-ADD-002/009/010/011 수동 카드는 gating-513이 해당 여부·코드 판정으로 대체
  // (여기선 더 이상 무조건 붙이지 않음)

  return { findings: next, manualItems: manuals };
}
