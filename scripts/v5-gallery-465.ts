/**
 * 465차 V5 갤러리 — 말뭉치 × 아키타입 8종의 export HTML을 정적 파일로 써서 집 PC에서 브라우저로 열어 눈으로 비교하기 위한 도구.
 * 문자열 렌더만 한다(브라우저·네트워크·서버 없음). 사진은 말뭉치가 가리키는 **로컬 placeholder**(`public/qa-fixtures/…`)뿐이며, 상대 경로로 바꿔 쓴다.
 * 산출물: review/465-gallery/<아키타입>/<픽스처>.html 과 index.html (git 무시 폴더 — 커밋하지 않는다).
 *   npx tsx scripts/v5-gallery-465.ts                      # 전부 (21 × 8)
 *   npx tsx scripts/v5-gallery-465.ts --only=fx-skincare-serum --arch=editorial,pop
 *   npx tsx scripts/v5-gallery-465.ts --compare=fx-skincare-serum   # 한 픽스처를 8종 + 비교(UP1) 나란히 보는 index
 * 외부 주소가 하나라도 있으면(xmlns·로컬 경로 제외) 경고하고 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests, type ArchetypeId } from "../lib/page-archetype-v5";
import { corpus, exportHtmlOf } from "./design-corpus";

export const OUT_DIR = "review/465-gallery";

/** 로컬 placeholder 사진 경로를 갤러리 파일 위치 기준 상대 경로로 바꾼다(file:// 로 열어도 보이게) */
export function localizeAssets(html: string, depth: number): string {
  const up = "../".repeat(depth);
  return html.replace(/(src|href)="\/(qa-fixtures|fonts)\//g, `$1="${up}public/$2/`);
}

/**
 * 실제로 요청이 나갈 수 있는 외부 주소 목록. 제외: SVG xmlns(w3.org), JSON-LD 어휘 주소(schema.org — 요청 아님),
 * 해석되지 않는 예약 도메인(.invalid — 말뭉치 픽스처의 합성 배경 자리표시자라 요청이 실패하고 사진 폴백이 동작한다)
 */
export function externalUrls(html: string): string[] {
  return [...html.matchAll(/https?:\/\/[^\s"')<>]+/g)].map((m) => m[0]).filter((u) => !/^https?:\/\/(www\.w3\.org|schema\.org)(\/|$)/.test(u) && !/^https?:\/\/[^/]+\.invalid(\/|$)/.test(u));
}

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main() {
  const only = arg("only")?.split(",").filter(Boolean);
  const compare = arg("compare");
  const archs = (arg("arch")?.split(",").filter(Boolean) as ArchetypeId[] | undefined) ?? [...ARCHETYPE_IDS];
  const files = corpus({ only: compare ? [compare] : only });
  let bad = 0;
  const links: string[] = [];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [id, file] of files) {
    // 기준(UP1): V5 꺼짐
    setDesignV5ForTests(false);
    setDesignUp1ForTests(true);
    const base = localizeAssets(exportHtmlOf(file), 3);
    fs.mkdirSync(path.join(OUT_DIR, "_up1"), { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "_up1", `${id}.html`), base);
    links.push(`<tr><td>${id}</td><td><a href="_up1/${id}.html">UP1(기준)</a></td>`);
    for (const a of archs) {
      setDesignV5ForTests(true);
      setV5ArchetypeForTests(a);
      const html = localizeAssets(exportHtmlOf(file), 3);
      const ext = externalUrls(html);
      if (ext.length) { bad += 1; console.error(`외부 주소 ${a}/${id}: ${ext.slice(0, 3).join(" ")}`); }
      fs.mkdirSync(path.join(OUT_DIR, a), { recursive: true });
      fs.writeFileSync(path.join(OUT_DIR, a, `${id}.html`), html);
      links.push(`<td><a href="${a}/${id}.html">${a}</a></td>`);
    }
    links.push("</tr>");
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  const index = `<!doctype html><meta charset="utf-8"><title>V5 갤러리</title><style>body{font:14px system-ui;padding:16px}td{padding:4px 10px;border-bottom:1px solid #ddd}</style><h1>V5 갤러리 (사진은 로컬 placeholder)</h1><table>${links.join("")}</table>`;
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), index);
  console.log(`쓴 파일: ${files.length * (archs.length + 1)}개 → ${OUT_DIR}/index.html${bad ? ` · 외부 주소 ${bad}건` : ""}`);
  if (bad) process.exit(1);
}

if (require.main === module) void main();
