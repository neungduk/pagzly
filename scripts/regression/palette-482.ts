/**
 * 482 A — 상품 팔레트: live-481 주조가 웜 노랑 계열, 면·포인트가 hue ±25° 안,
 * 극단 팔레트 4종 × 8종 통과, V5 off에 팔레트 토큰 잔존 없음.
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { colorRolesV5 } from "../../lib/color-roles-v5";
import { pickProductHueCluster, type HueCluster482 } from "../../lib/color-extract";
import {
  facesWithinPaletteHue482,
  hexHue,
  isWarmYellowHue482,
  paletteFromTheme482,
} from "../../lib/palette-from-product-482";
import { exportHtmlOf } from "../design-corpus";

export const name = "팔레트 482 — 상품 주조·±25°·극단4";

const LIVE = "scripts/fixtures/live-481.json";

const EXTREMES: Array<{ label: string; accent: string; deep?: string; soft?: string }> = [
  { label: "yellow", accent: "#E8C547", deep: "#6B5A12", soft: "#FAF6E8" },
  { label: "navy", accent: "#1B3A6B", deep: "#0C1A30", soft: "#E8EEF6" },
  { label: "neon", accent: "#39FF14", deep: "#146B08", soft: "#EFFFF0" },
  { label: "gray", accent: "#8A8A8A", deep: "#2A2A2A", soft: "#F2F2F2" },
];

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 단위: 스튜디오 청 + 노란 내용물 → 채도 높은 쪽
  const mock: HueCluster482[] = [
    { h: 208, weight: 361, meanSat: 0.4 },
    { h: 52, weight: 111, meanSat: 0.55 },
    { h: 54, weight: 36, meanSat: 0.37 },
  ];
  const picked = pickProductHueCluster(mock);
  if (!picked || !isWarmYellowHue482(picked.h)) {
    f.push(`K=3 선정 실패: got h=${picked?.h}`);
  }

  if (!fs.existsSync(LIVE)) {
    f.push(`픽스처 없음: ${LIVE}`);
    return f;
  }
  const live = JSON.parse(fs.readFileSync(LIVE, "utf8")) as {
    theme: { accent: string; deepAccent?: string; baseNeutral?: string; accentSoft?: string };
    themeDb481?: { accent: string };
  };
  const livePal = paletteFromTheme482(live.theme);
  if (!isWarmYellowHue482(livePal.primaryHue)) {
    f.push(`live-481 주조 hue ${livePal.primaryHue.toFixed(1)}° 가 노랑 계열 아님 (accent=${live.theme.accent})`);
  }
  if (live.themeDb481 && live.theme.accent === live.themeDb481.accent) {
    f.push("live-481 theme이 DB 구추출(청회색)과 동일 — 재추출 반영 필요");
  }

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    const roles = colorRolesV5(a, live.theme.accent, "#FAF8F3", livePal);
    if (!facesWithinPaletteHue482([roles.surface, roles.surfaceAlt, roles.point], livePal, 25)) {
      f.push(
        `${a}/live: 면·포인트 hue 이탈 surface=${roles.surface} point=${roles.point} (primaryHue=${livePal.primaryHue.toFixed(1)})`,
      );
    }
  }

  for (const ex of EXTREMES) {
    const pal = paletteFromTheme482({
      accent: ex.accent,
      deepAccent: ex.deep,
      accentSoft: ex.soft,
      baseNeutral: ex.soft,
    });
    for (const a of ARCHETYPE_IDS) {
      const roles = colorRolesV5(a, ex.accent, "#FAF8F3", pal);
      if (!facesWithinPaletteHue482([roles.surface, roles.surfaceAlt, roles.point], pal, 25)) {
        f.push(`${ex.label}/${a}: hue ±25 이탈 point=${roles.point} d=${(hexHue(roles.point) - pal.primaryHue).toFixed(1)}`);
      }
    }
  }

  // CDN 재추출(무료 읽기) — 실패해도 픽스처·단위로 통과 가능, 성공 시 교차검증
  try {
    const { extractProductTheme } = await import("../../lib/color-extract");
    const urls = (
      JSON.parse(fs.readFileSync(LIVE, "utf8")) as { imageUrls: string[] }
    ).imageUrls.filter((u) => u.includes("-enhanced.png")).slice(0, 3);
    if (urls.length) {
      const t = await extractProductTheme(urls);
      if (t && !isWarmYellowHue482(hexHue(t.accent))) {
        f.push(`CDN 재추출 accent=${t.accent} hue=${hexHue(t.accent).toFixed(1)} 노랑 아님`);
      }
    }
  } catch (e) {
    f.push(`CDN 재추출 오류(네트워크): ${e instanceof Error ? e.message.slice(0, 80) : String(e)}`);
  }

  setV5ArchetypeForTests("editorial");
  const on = exportHtmlOf(LIVE);
  if (!/--pz-s:/.test(on)) f.push("V5 on export에 --pz-s 없음");
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  const off = exportHtmlOf(LIVE);
  if (/--pz-s:/.test(off) || /--pz-surface:/.test(off)) f.push("V5 off에 color-roles 토큰 잔존");

  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.slice(0, 40).join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
