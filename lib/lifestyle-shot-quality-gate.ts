/**
 * 103차 B — AI 사용샷 생성 후 품질 게이트 (배선용).
 * 픽셀 유사도 + 선택적 Vision. Replicate 호출 없음.
 */
import sharp from "sharp";

export type LifestyleShotGateResult = {
  pass: boolean;
  reasons: string[];
  centerSimilarity: number;
};

async function loadBuffer(source: string): Promise<Buffer> {
  if (source.startsWith("data:")) {
    const b64 = source.split(",")[1];
    if (!b64) throw new Error("bad data url");
    return Buffer.from(b64, "base64");
  }
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("unsupported source");
}

async function centerSimilarity(a: Buffer, b: Buffer): Promise<number> {
  const size = 128;
  const [left, right] = await Promise.all([
    sharp(a).resize(size, size, { fit: "cover" }).removeAlpha().raw().toBuffer(),
    sharp(b).resize(size, size, { fit: "cover" }).removeAlpha().raw().toBuffer(),
  ]);
  if (left.length !== right.length || left.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < left.length; i += 1) {
    const d = left[i]! - right[i]!;
    sumSq += d * d;
  }
  const rmse = Math.sqrt(sumSq / left.length);
  return Math.max(0, 1 - rmse / 255);
}

/**
 * 참조 제품컷 vs 생성 사용샷.
 * - 중앙 유사도가 너무 낮으면 라벨/형태 환각으로 간주
 * - 생성본이 참조보다 면적이 과도하게 크면(대략) 스케일 이상으로 간주하기 어려우므로
 *   유사도만으로 1차 필터 (Vision 확장은 이후)
 */
export async function evaluateLifestyleShotGate(params: {
  referenceUrl: string;
  generatedUrl: string;
  /** 중앙 유사도 하한 — 기본 0.18 (장면이 다르면 낮게 나옴; 너무 낮으면 완전 다른 제품) */
  minCenterSimilarity?: number;
}): Promise<LifestyleShotGateResult> {
  const reasons: string[] = [];
  const minSim = params.minCenterSimilarity ?? 0.12;

  const [refBuf, genBuf] = await Promise.all([
    loadBuffer(params.referenceUrl),
    loadBuffer(params.generatedUrl),
  ]);

  const sim = await centerSimilarity(refBuf, genBuf);
  if (sim < minSim) {
    reasons.push(`center_similarity_low=${sim.toFixed(3)} (min ${minSim})`);
  }

  const [refMeta, genMeta] = await Promise.all([
    sharp(refBuf).metadata(),
    sharp(genBuf).metadata(),
  ]);
  if (!genMeta.width || !genMeta.height) {
    reasons.push("generated_dimensions_missing");
  }

  // 극단적 종횡비 붕괴
  if (refMeta.width && refMeta.height && genMeta.width && genMeta.height) {
    const refAr = refMeta.width / refMeta.height;
    const genAr = genMeta.width / genMeta.height;
    if (Math.abs(Math.log(refAr / genAr)) > 1.2) {
      reasons.push(`aspect_drift ref=${refAr.toFixed(2)} gen=${genAr.toFixed(2)}`);
    }
  }

  void refMeta;
  return {
    pass: reasons.length === 0,
    reasons,
    centerSimilarity: sim,
  };
}
