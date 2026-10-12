/**
 * 113차 — 전자제품 구성품 배치도 (심플 SVG 도형 + 라벨).
 * 174차 — Recraft 정적 아이콘(런타임 API 없음). 구성품 목록이 파싱될 때만 렌더.
 * 157차 — 화장품/뷰티의 기획·증정 세트 구성(package_contents 슬롯 재사용)도
 * 같은 파서/컴포넌트로 처리하도록 접두어(사은품/증정/기획) 인식 추가.
 */
import { diagramIconGroup, diagramTitleWithIconHtml } from "@/lib/diagram-icons";

export type PackageItem = { label: string };

const PLACEHOLDER = /판매자\s*확인|문의|확인\s*필요|미정/;

/**
 * "구성품: 본체, 케이블, 설명서" / "사은품: 토너 50ml, 마스크 1매" 같은
 * 접두어 + bullet/comma 목록 파싱. 2개 미만이면 null.
 */
export function parsePackageContentsList(
  raw: string | null | undefined,
): PackageItem[] | null {
  if (!raw?.trim()) return null;
  let text = raw.trim();
  text = text.replace(/^(구성품|포함|사은품|증정품?|기획\s*구성)\s*[:：]?\s*/i, "");
  // "…, 퀵가이드가 함께 들어 있어요." — 마지막 항목에 붙은 서술어는 라벨이 아니다.
  text = text
    .replace(
      /(?:이|가|을|를|까지)?\s*(?:모두\s*|함께\s*|같이\s*)?(?:들어\s*있(?:어요|습니다|다)|포함(?:되어\s*있어요|되어\s*있습니다|됩니다|돼요|해요)|제공(?:됩니다|돼요|해요)|구성(?:됩니다|돼요))\s*[.!]?\s*$/,
      "",
    )
    .replace(/[.!]\s*$/, "");
  // "이어팁 S/M/L"처럼 짧은 사이즈·규격 묶음의 슬래시는 구분자가 아니다.
  text = text.replace(/\b[A-Za-z0-9]{1,3}(?:\/[A-Za-z0-9]{1,3})+\b/g, (m) => m.replace(/\//g, "\u2215"));

  const parts = text
    .split(/[,，、·/|;|\n•·]+/)
    .map((p) => p.replace(/^\d+[.)]\s*/, "").replace(/\u2215/g, "/").trim())
    .filter((p) => p.length >= 1 && p.length <= 28 && !PLACEHOLDER.test(p));

  const seen = new Set<string>();
  const items: PackageItem[] = [];
  for (const label of parts) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ label });
  }
  if (items.length < 2) return null;
  return items.slice(0, 8);
}

export function preparePackageContentsItems(
  sectionBody?: string | null,
  keyFeatures?: string | null,
): PackageItem[] | null {
  return (
    parsePackageContentsList(sectionBody) ??
    parsePackageContentsList(keyFeatures) ??
    null
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 셀 폭 160 − 라벨 시작 오프셋 28 − 여백. 12px 기준 한글 ≈ 12px, 라틴·숫자 ≈ 7px. */
const LABEL_MAX_PX = 124;

function fitDiagramLabel(label: string, maxPx: number): string {
  const charPx = (ch: string) => (/[\u3131-\uD7A3]/.test(ch) ? 12 : ch === " " ? 3.5 : 7);
  let width = 0;
  for (const ch of label) width += charPx(ch);
  if (width <= maxPx) return label;
  let out = "";
  width = charPx("…");
  for (const ch of label) {
    if (width + charPx(ch) > maxPx) break;
    out += ch;
    width += charPx(ch);
  }
  return `${out.trimEnd()}…`;
}

/** 2열 그리드 — 정적 박스 아이콘 + 라벨 (174차). 좌표·라벨 로직 동일. */
export function buildPackageContentsDiagramSvg(
  items: PackageItem[],
  strokeColor: string,
  labelColor: string,
): string {
  if (items.length < 2) return "";

  const cols = 2;
  const cellW = 160;
  const cellH = 72;
  const rows = Math.ceil(items.length / cols);
  const width = cols * cellW + 20;
  const height = rows * cellH + 16;

  const nodes = items
    .map((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 40 + col * cellW;
      const cy = 36 + row * cellH;
      const label = fitDiagramLabel(item.label, LABEL_MAX_PX);
      const iconId = i % 2 === 0 ? "package-box" : "package-kit";
      const icon = diagramIconGroup(iconId, strokeColor, {
        x: cx - 14,
        y: cy - 14,
        size: 28,
      });
      return `
      ${icon}
      <text x="${cx + 28}" y="${cy + 5}" font-size="12" fill="${labelColor}">${escapeXml(label)}</text>
    `;
    })
    .join("");

  return `<div style="max-width:360px;margin:28px auto 0" data-diagram="package-contents">
    ${diagramTitleWithIconHtml("구성품", "package-box", labelColor)}
    <svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:360px;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="구성품 배치도">
      ${nodes}
    </svg>
  </div>`;
}
