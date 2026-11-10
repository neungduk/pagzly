/**
 * 506 — KR/US 성분표 파싱(데이터 범위 내). INCI 유효성·금지성분 판정 없음.
 */
import { normalizeLabelText } from "@/lib/label-check/extract-pdf";

/** 괄호 안 콤마 보호 + 줄바꿈 하이픈 결합 후 콤마/가운뎃점 분리 */
export function parseIngredientList506(region: string): string[] {
  let s = region.normalize("NFC");
  // 줄바꿈 하이픈 결합: "Aqua-\nWater" → "AquaWater" 가 아니라 "AquaWater" — 보통 "gly-\ncerin" → glycerin
  s = s.replace(/(\w)-\s*\n\s*(\w)/g, "$1$2");
  s = s.replace(/\n+/g, " ");
  // 괄호 보호
  const protectedParts: string[] = [];
  s = s.replace(/\([^)]*\)|\（[^）]*\）/g, (m) => {
    const i = protectedParts.length;
    protectedParts.push(m);
    return `__P${i}__`;
  });
  const raw = s.split(/[,，、·•]/).map((p) => p.trim()).filter(Boolean);
  return raw.map((p) =>
    p.replace(/__P(\d+)__/g, (_, n) => protectedParts[Number(n)] || ""),
  );
}

export function extractIngredientsRegionText506(text: string, market: "KR" | "US"): string | null {
  const norm = normalizeLabelText(text);
  const startKeys = market === "US" ? ["ingredients"] : ["전성분", "ingredients"];
  let start = -1;
  let keyLen = 0;
  for (const k of startKeys) {
    const nk = normalizeLabelText(k);
    const idx = norm.indexOf(nk);
    if (idx >= 0 && (start < 0 || idx < start)) {
      start = idx;
      keyLen = nk.length;
    }
  }
  if (start < 0) return null;
  const endKeys =
    market === "US"
      ? ["net", "distributedby", "madein", "warning", "directions", "questions"]
      : [
          "사용할때의주의사항",
          "주의사항",
          "내용량",
          "제조번호",
          "사용기한",
          "가격",
          "바코드",
          "화장품책임판매업자",
        ];
  let end = norm.length;
  for (const k of endKeys) {
    const nk = normalizeLabelText(k);
    const idx = norm.indexOf(nk, start + keyLen);
    if (idx >= 0 && idx < end) end = idx;
  }
  // 원문 근사: normalize가 공백을 지우므로 raw에서 키워드 위치 재탐색
  const rawLower = text.toLowerCase();
  const rawKeys = market === "US" ? ["ingredients"] : ["전성분", "ingredients"];
  let rawStart = -1;
  let rawKey = "";
  for (const k of rawKeys) {
    const idx = market === "US" ? rawLower.indexOf(k) : text.indexOf(k);
    const i = idx >= 0 ? idx : rawLower.indexOf(k.toLowerCase());
    if (i >= 0 && (rawStart < 0 || i < rawStart)) {
      rawStart = i;
      rawKey = text.slice(i, i + k.length);
    }
  }
  if (rawStart < 0) return null;
  let rawEnd = text.length;
  const rawEndKeys =
    market === "US"
      ? ["\nNet", "\nDistributed", "\nMade in", "\nWarning", "\nDirections"]
      : ["\n사용할", "\n주의사항", "\n내용량", "\n제조번호", "\n사용기한"];
  for (const k of rawEndKeys) {
    const idx = text.indexOf(k, rawStart + rawKey.length);
    if (idx >= 0 && idx < rawEnd) rawEnd = idx;
  }
  // 콜론 뒤부터
  let body = text.slice(rawStart + rawKey.length, rawEnd);
  body = body.replace(/^[\s:：]+/, "");
  return body.trim() || null;
}

export function countHangulChars506(s: string): number {
  return (s.normalize("NFC").match(/[가-힣]/g) || []).length;
}
