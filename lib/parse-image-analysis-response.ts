import {
  parseVisionImageRoles,
  type VisionImageRoleJudgment,
} from "@/lib/image-roles";

function salvageRolesArrayFromText(
  text: string,
  imageCount: number,
): VisionImageRoleJudgment[] {
  // 잘린 JSON에서도 "roles":[ ... ] 구간만 추출 시도
  const rolesKey = text.match(/"roles"\s*:\s*\[/);
  if (!rolesKey || rolesKey.index == null) return [];
  const from = rolesKey.index + rolesKey[0].length - 1; // '['
  let depth = 0;
  let end = -1;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const slice = end > from ? text.slice(from, end + 1) : text.slice(from);
  let candidate = slice;
  if (end < 0) {
    const lastObj = candidate.lastIndexOf("}");
    if (lastObj < 0) return [];
    candidate = `${candidate.slice(0, lastObj + 1)}]`;
  }
  try {
    const arr = JSON.parse(candidate) as unknown;
    return parseVisionImageRoles(arr).filter((r) => r.index < imageCount);
  } catch {
    return [];
  }
}

/** Claude Vision 이미지 분석 JSON → analysis + roles (잘림·변형 스키마 복구 포함) */
export function parseImageAnalysisResponse(
  rawText: string,
  imageCount: number,
): { analysis: string; roles: VisionImageRoleJudgment[] } {
  const trimmed = rawText.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  try {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const json = JSON.parse(candidate.slice(start, end + 1)) as {
        analysis?: unknown;
        roles?: unknown;
      };
      const analysis =
        typeof json.analysis === "string" && json.analysis.trim()
          ? json.analysis.trim()
          : "";
      const roles = parseVisionImageRoles(json.roles).filter(
        (r) => r.index < imageCount,
      );
      if (roles.length > 0) {
        return { analysis: analysis || trimmed, roles };
      }
    }
  } catch (err) {
    console.warn("[image-analysis] full JSON 파싱 실패 — roles 부분 복구 시도", err);
  }

  const salvaged = salvageRolesArrayFromText(candidate, imageCount);
  if (salvaged.length > 0) {
    console.warn(
      `[image-analysis] salvaged roles=${salvaged.length} from partial JSON`,
    );
    const analysisMatch = candidate.match(
      /"analysis"\s*:\s*"((?:\\.|[^"\\])*)"/,
    );
    const analysis =
      analysisMatch?.[1]
        ?.replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\") ?? trimmed;
    return { analysis, roles: salvaged };
  }

  const stringRoles = candidate.match(
    /"roles"\s*:\s*\[((?:\s*"(?:hero|detail|lifestyle|package|other)"\s*,?)+\s*)\]/,
  );
  if (stringRoles?.[1]) {
    const names = [
      ...stringRoles[1].matchAll(/"(hero|detail|lifestyle|package|other)"/g),
    ].map((m) => m[1]);
    const roles = parseVisionImageRoles(
      names.map((role, index) => ({ index, role, confidence: 0.75 })),
    ).filter((r) => r.index < imageCount);
    if (roles.length > 0) {
      return { analysis: trimmed, roles };
    }
  }

  console.warn(
    `[image-analysis] roles 없음 — 서술만 사용 (chars=${trimmed.length})`,
  );
  return { analysis: trimmed, roles: [] };
}
