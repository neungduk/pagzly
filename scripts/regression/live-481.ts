/**
 * 481차 — live-481 실사 픽스처 회귀.
 * 8종 렌더: ① 제목 서체 2종 이상 분화 ② 영문 slug 화면 노출 0 ③ 대비 실패 0 ④ 가로 넘침 위험 표식 0.
 * 브라우저·유료 호출 없음.
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { TYPE_PAIR_V5, V5_FONT_CSS, titleFamiliesDistinct } from "../../lib/type-system-v5";
import { colorRolesV5 } from "../../lib/color-roles-v5";
import { contrastRatioToken } from "../../lib/design-tokens";
import { exportHtmlOf } from "../design-corpus";
import { slotDisplayLabel } from "../../components/GeneratingOverlay";

export const name = "실사 481 — live-481 서체·slug·대비";

const FIXTURE = "scripts/fixtures/live-481.json";
const SLUGS = [
  "seller_trust_evidence",
  "seller_trust_evi",
  "ingredient_circle_pair",
  "ingredient_circl",
  "ingredient_circle_solo",
  "packaging_design",
  "how_it_works",
  "size_options",
  "customer_scenario",
  "comparison_chart",
  "quick_points",
  "target_persona",
];

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  if (!fs.existsSync(FIXTURE)) {
    f.push(`픽스처 없음: ${FIXTURE}`);
    return f;
  }
  if (titleFamiliesDistinct() < 5) f.push(`제목 서체 체계 ${titleFamiliesDistinct()} < 5`);

  for (const slug of SLUGS) {
    const label = slotDisplayLabel(slug, slug);
    if (/^[a-z0-9_]+$/i.test(label)) f.push(`라벨이 slug 그대로: ${slug} → ${label}`);
  }

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const titleNames = new Set<string>();
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const h = exportHtmlOf(FIXTURE);
    if (!/data-pz-bsig="/.test(h)) f.push(`${a}: data-pz-bsig 없음`);
    if (!/data-pz-vsig="/.test(h)) f.push(`${a}: data-pz-vsig 없음`);
    const pair = TYPE_PAIR_V5[a];
    const famName = V5_FONT_CSS[pair.title].family;
    titleNames.add(famName);
    if (!h.includes(famName)) f.push(`${a}: 제목 패밀리 '${famName}' 미표기`);
    const cssKey = V5_FONT_CSS[pair.title].css;
    if (pair.title !== "noto-sans-kr" && !h.includes(`/fonts/${cssKey}.css`)) {
      f.push(`${a}: 폰트 CSS 링크 없음 (/fonts/${cssKey}.css)`);
    }
    const roles = colorRolesV5(a, "#20547E");
    if (contrastRatioToken(roles.ink, roles.surface) < 4.5) {
      f.push(`${a}: ink/surface 대비 < 4.5`);
    }
    const text = visibleText(h);
    for (const slug of SLUGS) {
      if (text.includes(slug)) f.push(`${a}: 화면 텍스트에 slug '${slug}'`);
    }
    // 킥커로 바뀐 SELLER TRUST… 형태도 금지
    if (/SELLER\s+TRUST/i.test(text) || /INGREDIENT\s+CIRCLE/i.test(text)) {
      f.push(`${a}: 킥커/라벨에 영문 slug 파생 노출`);
    }
    // 가로 넘침 위험: 고정 폭이 뷰포트보다 큰 인라인(750 초과)
    if (/width:\s*(8[0-9]{2}|9[0-9]{2}|[1-9][0-9]{3,})px/.test(h)) {
      f.push(`${a}: 750px 초과 고정 width 의심`);
    }
    if (!/overflow-x:\s*hidden|overflow:\s*hidden/.test(h) && !/class="[^"]*overflow-hidden/.test(h)) {
      // export wrap은 overflow hidden을 쓰는 편 — 없으면 경고
      if (!/pagzly-wrap/.test(h)) f.push(`${a}: wrap 없음`);
    }
  }
  if (titleNames.size < 2) f.push(`아키타입별 제목 서체 분화 ${titleNames.size}종 < 2`);

  setV5ArchetypeForTests(null);
  // 자동 선택(accent 포함 경로와 동일하게 exportArgsOf→theme.accent)
  const auto = exportHtmlOf(FIXTURE);
  if (!/data-pz-bsig="(catalog|softlife|luxe|techsheet|editorial|narrative|pop|impact)"/.test(auto)) {
    f.push("자동 선택 bsig 없음/비정상");
  }

  setDesignV5ForTests(false);
  const off = exportHtmlOf(FIXTURE);
  if (/data-pz-bsig=/.test(off) || /--pz-v5-title:/.test(off)) f.push("V5 off에 bsig/서체 변수 잔존");

  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.slice(0, 60).join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
