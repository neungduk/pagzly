/**
 * 510B — 의약품 효능 승격·사용기한 값·US 하드 문구·OCR 확인 화면 정적 검사.
 */
import fs from "node:fs";
import path from "node:path";
import { scanAdPhrases493 } from "../../lib/label-check/ad-phrases";
import { scanUsAdPhrases500 } from "../../lib/label-check/ad-phrases-us";
import { runLabelCheckFromExtracted } from "../../lib/label-check/run-check";
import { textToExtractedPdf506 } from "../../lib/label-check/text-mode-506";
import {
  NOTICE_OCR_PARTIAL_510,
  NOTICE_OCR_REVIEW_510,
  NOTICE_OCR_REVIEW_USED_510,
} from "../../lib/label-check/ocr/constants";

export const name = "표시사항 510 — 효능·사용기한·OCR확인 정확도";

const KR_INPUT = { rinseOff: false, functional: false as const };

function hasPossible(findings: { status: string; found?: string; label?: string }[], needle: string) {
  return findings.some(
    (f) =>
      f.status === "possible" &&
      ((f.found || "").includes(needle) || (f.label || "").includes(needle)),
  );
}

function hasAttentionOrPossible(
  findings: { status: string; found?: string }[],
  needle: string,
) {
  return findings.some(
    (f) =>
      (f.status === "possible" || f.status === "attention") &&
      (f.found || "").includes(needle),
  );
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // A) KR — 올라가야 하는 문구 → possible
  {
    const mustUp = [
      "치료에 효과",
      "피부 재생",
      "완전 제거",
      "여드름을 치료합니다",
      "영구적으로 주름 제거",
      "완치",
    ];
    for (const t of mustUp) {
      const hits = scanAdPhrases493(t, KR_INPUT);
      if (!hits.some((x) => x.status === "possible")) {
        f.push(`510A: "${t}" 고칠 것 미승격 (${hits.map((x) => x.status + ":" + x.found).join("|") || "없음"})`);
      }
    }
    // 반대: 올라가면 안 되는 문구
    const mustStay = ["보습", "피부 결 개선", "윤기 케어"];
    for (const t of mustStay) {
      const hits = scanAdPhrases493(t, KR_INPUT);
      if (hits.some((x) => x.status === "possible")) {
        f.push(`510A: "${t}" 가 고칠 것으로 잘못 승격`);
      }
    }
    // 주름 개선은 기능성 확인(attention) — possible 금지(하드 아님)
    const wrinkle = scanAdPhrases493("주름 개선", KR_INPUT);
    if (wrinkle.some((x) => x.status === "possible")) {
      f.push("510A: 주름 개선이 고칠 것으로 승격됨");
    }
  }

  // B) 사용기한 4가지
  {
    const base =
      "제품명 테스트크림\n내용량 100ml\n전성분: 정제수\n제조번호 LOT1\n책임판매업자 테스트\n가격 1000원\n제조국 대한민국\n";
    const cases: Array<{ id: string; line: string; want: "pass" | "attention" }> = [
      { id: "kw-only", line: "사용기한", want: "attention" },
      { id: "empty", line: "사용기한: 별도 표기 없음", want: "attention" },
      { id: "36m", line: "사용기한: 제조일로부터 36개월", want: "pass" },
      { id: "12M", line: "개봉 후 12M", want: "pass" },
    ];
    for (const c of cases) {
      const r = await runLabelCheckFromExtracted(textToExtractedPdf506(base + c.line), {
        ...KR_INPUT,
        market: "KR",
      });
      const exp = r.findings.find((x) => x.label.includes("사용기한"));
      if (!exp) {
        f.push(`510B: ${c.id} 사용기한 finding 없음`);
        continue;
      }
      if (exp.status !== c.want) {
        f.push(`510B: ${c.id} status=${exp.status} want=${c.want}`);
      }
      if (c.want === "attention" && !exp.suggest.includes("값을 찾지 못했어요")) {
        f.push(`510B: ${c.id} 안내 문구 불일치`);
      }
    }
  }

  // C) US — 고칠 것 / 반대
  {
    const usBad = scanUsAdPhrases500("Reduces wrinkles permanently. Cures acne.");
    if (!usBad.some((x) => x.status === "possible")) {
      f.push(`510C: US permanently/cures 미승격 (${usBad.map((x) => x.status).join(",")})`);
    }
    if (!hasPossible(usBad, "Cure") && !usBad.some((x) => /cure/i.test(x.found || ""))) {
      f.push("510C: cures 미검출");
    }
    const fda = scanUsAdPhrases500("FDA approved anti-aging cream");
    if (!fda.some((x) => x.status === "possible")) f.push("510C: FDA approved 미승격");
    const soft = scanUsAdPhrases500("reduces the appearance of wrinkles");
    if (soft.some((x) => x.status === "possible" || x.status === "attention")) {
      f.push("510C: appearance of wrinkles 가 잘못 지적됨");
    }
    const clin = scanUsAdPhrases500("clinically proven to cure acne");
    if (!clin.some((x) => x.status === "possible")) f.push("510C: clinically proven to cure 미승격");
  }

  // D) OCR 확인 화면 정적
  {
    const card = fs.readFileSync(
      path.join("components", "label-check", "ui-507", "OcrReviewCard.tsx"),
      "utf8",
    );
    const css = fs.readFileSync(
      path.join("components", "label-check", "ui-507", "label-check-507.css"),
      "utf8",
    );
    if (!card.includes("NOTICE_OCR_REVIEW_510") || !card.includes("NOTICE_OCR_REVIEW_USED_510")) {
      f.push("510D: 확인 안내 문구 상수 미사용");
    }
    if (!card.includes("NOTICE_OCR_PARTIAL_510") || !card.includes("onFocusPaste")) {
      f.push("510D: partial 안내·붙여넣기 미배선");
    }
    if (!/overflow-x:\s*hidden/.test(css) || !css.includes("lc507-ocr-review")) {
      f.push("510D: 가로 스크롤 CSS");
    }
    const guest = fs.readFileSync(path.join("app", "label-check", "page.tsx"), "utf8");
    const member = fs.readFileSync(path.join("app", "label-check", "new", "page.tsx"), "utf8");
    if (!guest.includes("readStatus") || !member.includes("readStatus")) {
      f.push("510D: 페이지 readStatus 미전달");
    }
    void NOTICE_OCR_REVIEW_510;
    void NOTICE_OCR_REVIEW_USED_510;
    void NOTICE_OCR_PARTIAL_510;
  }

  // 금지어
  {
    // ad-phrases.ts 기존 BOUNDARY에 "100%" 패턴 문자열이 있어 제외
    const roots = [
      "lib/label-check/ad-hard-claims-510.ts",
      "components/label-check/ui-507/OcrReviewCard.tsx",
    ];
    const forbidden = ["위반입니다", "적법", "완벽", "보장", "안전합니다", "100%"];
    for (const file of roots) {
      if (!fs.existsSync(file)) continue;
      const t = fs.readFileSync(file, "utf8");
      for (const w of forbidden) {
        if (t.includes(w)) f.push(`510: 금지어 ${w} in ${file}`);
      }
    }
  }

  void hasAttentionOrPossible;
  return f;
}

if (require.main === module)
  void run().then((x) => {
    for (const s of x) console.log(s);
    process.exit(x.length ? 1 : 0);
  });
