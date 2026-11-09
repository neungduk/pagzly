/**
 * 495 — 검수 결과 요약만 저장. PDF 원문·파일명·추출 텍스트 금지.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { LABEL_CHECK_MAX_RUNS_PER_USER } from "@/lib/label-check/member-constants";
import type { LabelCheckResult, LabelMarket } from "@/lib/label-check/types";

export type SavedFinding = {
  label: string;
  status: string;
  /** 한 줄 설명 — suggest만(found/스니펫 제외) */
  line: string;
};

export type SaveRunInput = {
  market: LabelMarket;
  productName: string | null;
  options: Record<string, unknown>;
  result: LabelCheckResult;
};

/** 저장용 findings — 제목·상태·suggest 한 줄. found(PDF 조각) 제외 */
export function sanitizeFindingsForSave(result: LabelCheckResult): SavedFinding[] {
  return (result.findings || []).map((f) => ({
    label: String(f.label || "").slice(0, 120),
    status: String(f.status || ""),
    line: String(f.suggest || "").slice(0, 160),
  }));
}

export function assertSavePayloadSafe(payload: {
  findings: SavedFinding[];
  options: Record<string, unknown>;
  product_name: string | null;
}): string[] {
  const errs: string[] = [];
  const blob = JSON.stringify(payload);
  if (/%PDF-|LABELCHECK_TEXT|Ingredients: Aqua/i.test(blob) && /found|rawText|pdfText|fileName|filename/i.test(blob)) {
    errs.push("suspicious pdf fields");
  }
  if ("fileName" in payload.options || "filename" in payload.options || "rawText" in payload.options) {
    errs.push("options must not include file/raw text keys");
  }
  for (const f of payload.findings) {
    if ("found" in (f as object)) errs.push("finding.found forbidden");
    // 긴 원문 조각 휴리스틱
    if ((f.line || "").length > 160) errs.push("line too long");
  }
  return errs;
}

export async function saveLabelCheckRun(
  supabase: SupabaseClient,
  userId: string,
  input: SaveRunInput,
): Promise<{ id: string } | { error: string }> {
  const productName = input.productName?.trim()
    ? input.productName.trim().slice(0, 80)
    : null;
  const findings = sanitizeFindingsForSave(input.result);
  const summary = {
    possible: input.result.summary.possible,
    attention: input.result.summary.attention,
    unknown: input.result.summary.unknown,
    pass: input.result.summary.pass,
    manual: input.result.summary.manual,
  };
  const options = { ...input.options };
  delete (options as { fileName?: unknown }).fileName;
  delete (options as { filename?: unknown }).filename;
  delete (options as { rawText?: unknown }).rawText;

  const safeErrs = assertSavePayloadSafe({
    findings,
    options,
    product_name: productName,
  });
  if (safeErrs.length) return { error: "unsafe_payload" };

  // 최근 200건 유지: 초과분 오래된 것부터 삭제
  const { count } = await supabase
    .from("label_check_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= LABEL_CHECK_MAX_RUNS_PER_USER) {
    const overflow = (count ?? 0) - LABEL_CHECK_MAX_RUNS_PER_USER + 1;
    const { data: oldRows } = await supabase
      .from("label_check_runs")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(Math.max(overflow, 1));
    const ids = (oldRows || []).map((r) => r.id as string);
    if (ids.length) {
      await supabase.from("label_check_runs").delete().in("id", ids);
    }
  }

  const { data, error } = await supabase
    .from("label_check_runs")
    .insert({
      user_id: userId,
      market: input.market,
      product_name: productName,
      options,
      summary,
      findings,
    })
    .select("id")
    .single();

  if (error || !data?.id) return { error: error?.message || "insert_failed" };
  return { id: data.id as string };
}
