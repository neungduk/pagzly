/**
 * 507 — 화면 표기·결론·탭 기본 선택(판정 로직 변경 없음).
 */
import type { CheckStatus, Finding, FindingFix506, LabelCheckResult } from "@/lib/label-check/types";

export type UiBucket507 = "fix" | "check" | "unknown" | "pass" | "manual";

export const STATUS_LABEL_507: Record<CheckStatus, string> = {
  possible: "고칠 것",
  attention: "확인할 것",
  unknown: "확인 못 함",
  pass: "문제 없음",
};

export const MANUAL_LABEL_507 = "직접 확인";

export function statusToBucket507(status: CheckStatus): UiBucket507 {
  if (status === "possible") return "fix";
  if (status === "attention") return "check";
  if (status === "unknown") return "unknown";
  return "pass";
}

export function bucketLabel507(b: UiBucket507): string {
  if (b === "fix") return "고칠 것";
  if (b === "check") return "확인할 것";
  if (b === "unknown") return "확인 못 함";
  if (b === "manual") return MANUAL_LABEL_507;
  return "문제 없음";
}

export type Verdict507 = {
  headline: string;
  subNote?: string;
};

export function buildVerdict507(
  summary: LabelCheckResult["summary"],
  opts?: {
    readStatus?: LabelCheckResult["readStatus"];
    skipJudgment?: boolean;
  },
): Verdict507 {
  // 508 — 점검 불가: "발견된 항목이 없어요"/문제 없음 제목 금지
  if (opts?.readStatus === "unreadable") {
    return { headline: "글자를 읽지 못해 점검하지 못했어요" };
  }
  if (opts?.skipJudgment && opts?.readStatus !== "partial" && opts?.readStatus !== "ok") {
    // 레거시 skip(읽기 실패)도 동일 제목 — 빈 요약을 통과로 오해하지 않게
    if (!summary.possible && !summary.attention && !summary.unknown && !summary.pass) {
      return { headline: "글자를 읽지 못해 점검하지 못했어요" };
    }
  }
  const fix = summary.possible || 0;
  const check = (summary.attention || 0) + (summary.manual || 0);
  if (fix > 0) {
    return { headline: `먼저 고칠 곳이 ${fix}군데 있어요` };
  }
  if (check > 0) {
    return { headline: `확인할 곳이 ${check}군데 있어요` };
  }
  if (opts?.readStatus === "partial") {
    return {
      headline: "읽은 부분에서는 발견된 항목이 없어요",
      subNote: "최종 확인은 직접 하셔야 합니다.",
    };
  }
  return {
    headline: "이번 점검에서 발견된 항목이 없어요",
    subNote: "최종 확인은 직접 하셔야 합니다.",
  };
}

/** 건수가 있는 가장 심각한 탭: fix > check > unknown > pass */
export function defaultTab507(counts: {
  fix: number;
  check: number;
  unknown: number;
  pass: number;
}): UiBucket507 {
  if (counts.fix > 0) return "fix";
  if (counts.check > 0) return "check";
  if (counts.unknown > 0) return "unknown";
  return "pass";
}

export function fixKindHeading507(kind: FindingFix506["kind"] | undefined): string {
  switch (kind) {
    case "fill":
      return "이렇게 넣으세요";
    case "replace":
      return "이렇게 바꿔 보세요 (예시)";
    case "delete":
      return "이 표현은 빼는 걸 권해요";
    case "evidence":
      return "근거 자료가 있으면 쓸 수 있어요";
    case "functional_only":
      return "기능성화장품만 쓸 수 있어요";
    case "manual":
      return "직접 확인해 주세요";
    default:
      return "이렇게 하세요";
  }
}

export function compareBanner507(compare: NonNullable<LabelCheckResult["compare"]>): string {
  return `${compare.resolved.length}개 해결 · ${compare.remaining.length}개 남음 · 새로 생김 ${compare.added.length}`;
}

/** evidence 문장에서 found 강조용 조각(앞뒤 40자) */
export function highlightEvidence507(
  sentence: string,
  found: string,
): { before: string; hit: string; after: string } | null {
  if (!sentence || !found) return null;
  const idx = sentence.indexOf(found);
  if (idx < 0) {
    const lower = sentence.toLowerCase();
    const f = found.toLowerCase();
    const i2 = lower.indexOf(f);
    if (i2 < 0) return { before: sentence.slice(0, 80), hit: found, after: "" };
    const a = Math.max(0, i2 - 40);
    const b = Math.min(sentence.length, i2 + found.length + 40);
    return {
      before: (a > 0 ? "…" : "") + sentence.slice(a, i2),
      hit: sentence.slice(i2, i2 + found.length),
      after: sentence.slice(i2 + found.length, b) + (b < sentence.length ? "…" : ""),
    };
  }
  const a = Math.max(0, idx - 40);
  const b = Math.min(sentence.length, idx + found.length + 40);
  return {
    before: (a > 0 ? "…" : "") + sentence.slice(a, idx),
    hit: found,
    after: sentence.slice(idx + found.length, b) + (b < sentence.length ? "…" : ""),
  };
}

export function sortFindings507(findings: Finding[]): Finding[] {
  const rank = (s: CheckStatus) =>
    s === "possible" ? 0 : s === "attention" ? 1 : s === "unknown" ? 2 : 3;
  return [...findings].sort((a, b) => {
    const d = rank(a.status) - rank(b.status);
    if (d !== 0) return d;
    return a.label.localeCompare(b.label, "ko");
  });
}

export const UPLOAD_TITLE_507 =
  "화장품 라벨·광고 문구, 인쇄 전에 한 번 더 확인하세요";

export const CTA_LABEL_507 = "점검하기";
export const PROGRESS_READ_507 = "글자 읽는 중…";
export const PROGRESS_RULES_507 = "규칙과 비교하는 중…";
