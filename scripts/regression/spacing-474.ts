/**
 * 회귀 — 474차 C: 간격 스케일·정렬 변수·V5 부품 임의 px·카드 시그니처.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { BODY_SIG } from "../../lib/body-sig-v5";
import { SPACE_SCALE_V5, alignOfV5, findRogueSpacingPx, snapPadTripleV5, snapSpaceV5 } from "../../lib/spacing-v5";
import { ARCHETYPES } from "../../lib/page-archetype-v5";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "간격 474 — 스케일·정렬선·임의 px";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  if (SPACE_SCALE_V5.join(",") !== "4,8,12,16,24,40,64,96") f.push("SPACE_SCALE_V5 불일치");
  if (snapSpaceV5(88) !== 96) f.push("snap 88→96 실패");
  if (snapSpaceV5(28) !== 24) f.push("snap 28→24 실패");
  for (const a of ARCHETYPE_IDS) {
    const [a0, a1, a2] = snapPadTripleV5(ARCHETYPES[a].pad);
    for (const n of [a0, a1, a2]) {
      if (!(SPACE_SCALE_V5 as readonly number[]).includes(n)) f.push(`${a}: pad ${n} 스케일 밖`);
    }
  }
  // luxe는 카드 목록 시그니처를 줄임
  if (BODY_SIG.luxe.list === "card") f.push("luxe list 가 아직 card");

  const files = ["lib/spacing-v5.ts", "lib/photo-compose-v5.ts", "lib/type-system-v5.ts"];
  for (const rel of files) {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    // 주석·문자열 예외: data 속성·문서용 숫자 제외 위해 함수 본문만 — 간단 전수 검사 후 허용 패턴 필터
    const rogue = findRogueSpacingPx(src).filter((x) => !/BLEED|drop \?\?|scale \?\?/.test(x));
    // photo-compose는 -24(BLEED)·-48(걸침) 등 의도적 음수 — 절댓값이 스케일이면 통과는 findRogue가 양수만 스케일 검사
    if (rogue.length) f.push(`${rel}: 임의 spacing ${rogue.slice(0, 3).join(" | ")}`);
  }

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const h = exportHtmlOf(corpus()[0]![1]);
    if (!h.includes(`--pz-align:${alignOfV5(a)}`)) f.push(`${a}: --pz-align 없음`);
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  for (const [, file] of corpus().slice(0, 3)) {
    if (/--pz-align:/.test(exportHtmlOf(file))) f.push("V5 off에 --pz-align 잔존");
  }
  return f;
}

if (require.main === module) void run().then((x) => { console.log(x.length ? x.slice(0, 40).join("\n") : "통과"); process.exit(x.length ? 1 : 0); });
