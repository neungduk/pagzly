import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";

/**
 * 무료 스톡 사진(Pexels 등)으로 견본을 만들 때 남의 브랜드 라벨이 찍힌 사진을 거른다.
 * 로컬 OCR(tesseract.js)만 사용 — 유료 비전 API 호출 없음. 서버 런타임이 아닌 스크립트 전용.
 */

export type LabelScan = { words: string[]; branded: boolean };

const MIN_CONFIDENCE = 70;

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker("eng").then(async (w) => {
    // 11 = SPARSE_TEXT — 사진 속 흩어진 라벨 글자를 문단 가정 없이 찾는다
    await w.setParameters({ tessedit_pageseg_mode: "11" as never });
    return w;
  });
  return workerPromise;
}

export async function closeLabelFilter(): Promise<void> {
  if (!workerPromise) return;
  const w = await workerPromise;
  workerPromise = null;
  await w.terminate();
}

/** 라벨 글자로 볼 수 있는 단어 — 영문 3자 이상, 모음 포함(노이즈 "lll"·"XXX" 제외) 또는 한자·한글 2자 이상 */
function isLabelWord(text: string): boolean {
  const t = text.replace(/[^A-Za-z\u4e00-\u9fff\uac00-\ud7a3]/g, "");
  if (/^[\u4e00-\u9fff\uac00-\ud7a3]{2,}$/.test(t)) return true;
  if (t.length < 3) return false;
  return /[aeiouAEIOU]/.test(t) && /[A-Za-z]{3,}/.test(t);
}

/**
 * 전체·중앙 확대·이진화·3×3 타일을 원본/반전으로 읽어 확신도 높은 단어를 모은다.
 */
export async function scanStockPhotoForLabel(input: Buffer | string): Promise<LabelScan> {
  const src = sharp(await sharp(input).rotate().toBuffer());
  const meta = await src.metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const full = src.clone().resize({ width: 1600, height: 1600, fit: "inside" }).grayscale().normalise();
  // 제품은 대개 가운데 — 중앙 60%를 2배 확대해 작은 라벨 글자도 읽는다
  const center = src
    .clone()
    .extract({ left: Math.floor(W * 0.2), top: Math.floor(H * 0.2), width: Math.floor(W * 0.6), height: Math.floor(H * 0.6) })
    .resize({ width: 2000, height: 2000, fit: "inside" })
    .grayscale()
    .normalise();
  const variants = [
    await full.clone().png().toBuffer(),
    await full.clone().negate().png().toBuffer(),
    await center.clone().png().toBuffer(),
    await center.clone().negate().png().toBuffer(),
    // 색 배경 위 흰 글자(파란 라벨 등)는 회색조 대비가 낮다 — 이진화로 분리
    await center.clone().threshold(150).png().toBuffer(),
    await center.clone().threshold(150).negate().png().toBuffer(),
  ];
  // 곡면 용기 라벨은 전체 축척에선 안 읽힌다 — 절반 크기 3×3 겹침 타일을 확대해 추가로 읽는다
  for (const fy of [0, 0.25, 0.5]) {
    for (const fx of [0, 0.25, 0.5]) {
      const tile = src
        .clone()
        .extract({
          left: Math.floor(W * fx),
          top: Math.floor(H * fy),
          width: Math.min(Math.floor(W * 0.5), W - Math.floor(W * fx)),
          height: Math.min(Math.floor(H * 0.5), H - Math.floor(H * fy)),
        })
        .resize({ width: 1400, height: 1400, fit: "inside" })
        .grayscale()
        .normalise();
      variants.push(await tile.png().toBuffer());
    }
  }
  const worker = await getWorker();
  const found = new Set<string>();
  for (const buf of variants) {
    const { data } = await worker.recognize(buf, {}, { blocks: true });
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          for (const word of line.words) {
            const letters = word.text.replace(/[^A-Za-z]/g, "").length;
            const confident = word.confidence >= MIN_CONFIDENCE || (letters >= 6 && word.confidence >= 50);
            if (confident && isLabelWord(word.text)) {
              found.add(word.text.replace(/[^\p{L}\p{N}&'-]/gu, ""));
            }
          }
        }
      }
    }
  }
  const words = [...found].filter(Boolean);
  // 스톡 후보는 넉넉하다 — 확신 높은 라벨 단어가 하나라도 읽히면 버린다(과잉 거절 쪽으로 안전)
  const branded = words.length >= 1;
  return { words, branded };
}
