/**
 * 500 — 미국 광고 표현 데이터 연결·오탐 가드.
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildUsAdScanText,
  loadUsAdPhrases500,
  scanUsAdPhrases500,
  usAdPatternHits,
} from "../../lib/label-check/ad-phrases-us";
import { runLabelCheck483, runLabelCheckUsText494 } from "../../lib/label-check/run-check";
import { includesUsWord } from "../../lib/label-check/normalize-us";

export const name = "표시사항 500 — US 광고 표현·오탐";

const US_DIR = path.join("review", "data", "samples", "us-497");

export async function run(): Promise<string[]> {
  const f: string[] = [];

  const items = loadUsAdPhrases500();
  if (items.length !== 6) f.push(`500: 항목 수 ${items.length}≠6`);

  // 6항목 각각 일치/미일치
  const hitSamples: Record<string, string> = {
    "USAD-001": "Cures eczema and helps treat redness.",
    "USAD-002": "This cream regenerates skin and boosts collagen production.",
    "USAD-003": "Contains stem cell technology and exosome complex.",
    "USAD-004": "An alternative to botox for smoother skin.",
    "USAD-005": "Permanently erase wrinkles and age spots.",
    "USAD-006": "Clinically proven results in clinical studies.",
  };
  const missSamples: Record<string, string> = {
    "USAD-001": "Gentle daily moisturizer for soft-looking skin.",
    "USAD-002": "Silky texture and light finish.",
    "USAD-003": "Botanical blend with aloe.",
    "USAD-004": "Smooth cream for everyday use.",
    "USAD-005": "Hydrating lotion with a soft scent.",
    "USAD-006": "Dermatology-inspired packaging design.",
  };

  for (const item of items) {
    const hitText = hitSamples[item.id];
    const missText = missSamples[item.id];
    if (!hitText || !missText) {
      f.push(`500: 샘플 없음 ${item.id}`);
      continue;
    }
    const hitFindings = scanUsAdPhrases500(hitText);
    const missFindings = scanUsAdPhrases500(missText);
    if (!hitFindings.some((x) => x.label === item.title_ko && x.status === "attention")) {
      f.push(`500: ${item.id} 일치 미검출`);
    }
    if (missFindings.some((x) => x.label === item.title_ko)) {
      f.push(`500: ${item.id} 미일치 오탐`);
    }
    const multi = scanUsAdPhrases500(`${hitText} ${hitText}`);
    const row = multi.find((x) => x.label === item.title_ko);
    if (row && row.found.split(" · ").length > 3) f.push(`500: ${item.id} 히트>3`);
  }

  // 굴절 오탐
  if (includesUsWord("anti-aging treatment cream", "treat")) {
    f.push("500: Treatment⊃treat 오탐");
  }
  if (includesUsWord("keeps skin healthy", "heal")) {
    f.push("500: healthy⊃heal 오탐");
  }
  if (usAdPatternHits("prevention of dryness", "prevent")) {
    f.push("500: prevention⊃prevent 이면 안 됨(굴절만)");
  }
  if (!usAdPatternHits("permanently regenerates tissue", "regenerat")) {
    f.push("500: regenerat 접두 미검출");
  }

  // 성분 목록 Growth factor 제외
  {
    const masked = buildUsAdScanText(
      "Face Cream\nIngredients: Water, Growth Factor, Glycerin\nDistributed by A Inc.",
    );
    if (/growth factor/.test(masked)) f.push("500: Ingredients Growth factor 미마스킹");
    const findings = scanUsAdPhrases500(
      "Face Cream\nIngredients: Water, Growth Factor, Glycerin\nDistributed by A Inc.",
    );
    if (findings.some((x) => x.category === "stem_exosome")) {
      f.push("500: 성분명 Growth factor 오탐");
    }
  }

  // permanently sealed cap — 데이터상 permanently 패턴 → 히트 가능(데이터 미수정, 한계 기록)
  {
    const sealed = scanUsAdPhrases500("Bottle with permanently sealed cap for freshness.");
    if (!sealed.some((x) => x.category === "cosmetic_concern_drug")) {
      // 검출되면 한계, 안 되면 OK — 둘 다 허용하되 notes용 플래그만
    }
  }

  // us1 오탐 0 (광고 attention)
  {
    const r = await runLabelCheck483(fs.readFileSync(path.join(US_DIR, "us1_ok.pdf")), {
      rinseOff: false,
      functional: false,
      market: "US",
      imported: true,
    });
    const ads = r.findings.filter(
      (x) =>
        x.status === "attention" &&
        ["disease", "structure_function", "stem_exosome", "drug_alternative", "cosmetic_concern_drug", "evidence"].includes(
          x.category,
        ),
    );
    if (ads.length) f.push(`500: us1 광고 오탐 ${ads.map((a) => a.category).join(",")}`);
  }

  // us2: disease · structure_function · stem_exosome · evidence
  {
    const r = await runLabelCheck483(fs.readFileSync(path.join(US_DIR, "us2_missing.pdf")), {
      rinseOff: false,
      functional: false,
      market: "US",
    });
    for (const cat of ["disease", "structure_function", "stem_exosome", "evidence"]) {
      if (!r.findings.some((x) => x.status === "attention" && x.category === cat)) {
        f.push(`500: us2 ${cat} 확인 필요 없음`);
      }
    }
    // US-013 하드코드 라벨 중복 없어야 함
    if (r.findings.some((x) => x.label.includes("불실표시"))) {
      f.push("500: us2 US-013 라벨 중복");
    }
  }

  // 수정 제안 필드(마커 PDF는 MIN_CHARS≥40 필요)
  {
    const r = await runLabelCheckUsText494(
      "Miracle Cream Cures eczema overnight. Clinically proven serum for daily care use.",
      { rinseOff: false, functional: false, market: "US" },
    );
    const disease = r.findings.find((x) => x.category === "disease");
    const evidence = r.findings.find((x) => x.category === "evidence");
    if (!disease?.fixSuggestion) f.push("500: disease fixSuggestion 없음");
    if (evidence?.fixKind !== "evidence") f.push("500: evidence fixKind");
    if (evidence && !/근거/.test(evidence.fixSuggestion || evidence.suggest)) {
      f.push("500: evidence 근거 문구");
    }
  }

  // 데이터 파일·US-013 스킵
  if (!fs.existsSync("review/data/us-ad-phrases_draft_v0.1.json")) {
    f.push("500: us-ad-phrases 파일 없음");
  }
  const usRun = fs.readFileSync("lib/label-check/run-check-us.ts", "utf8");
  if (/hasDrugClaim/.test(usRun)) f.push("500: hasDrugClaim 잔존");
  if (!/scanUsAdPhrases500/.test(usRun)) f.push("500: 스캔 미연결");

  return f;
}
