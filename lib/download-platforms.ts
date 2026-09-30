export type DownloadPlatformId = "smartstore" | "coupang" | "toss" | "ohouse";

export type DownloadPlatform = {
  id: DownloadPlatformId;
  label: string;
  width: number;
  hint: string;
  maxPartHeightPx?: number;
};

/** 마켓별 상세 이미지 권장 가로(px) — 후커블·GENCY 등 다채널 분할 다운로드 대응 */
export const DOWNLOAD_PLATFORMS: DownloadPlatform[] = [
  { id: "smartstore", label: "스마트스토어", width: 860, hint: "네이버 권장 860px" },
  { id: "coupang", label: "쿠팡", width: 780, hint: "쿠팡 상세 780px" },
  { id: "toss", label: "토스쇼핑", width: 750, hint: "모바일 표준 750px" },
  // 오늘의집 파트너센터 상품 설명 유의사항 "세로 10,000px / 용량 6MB 이하 권장"
  // https://www.partnerbucketplace.com/hc/ko/articles/25500904475545
  { id: "ohouse", label: "오늘의집", width: 750, hint: "자사몰·오늘의집 750px", maxPartHeightPx: 10_000 },
];

export function getDownloadPlatform(id: DownloadPlatformId): DownloadPlatform {
  return DOWNLOAD_PLATFORMS.find((p) => p.id === id) ?? DOWNLOAD_PLATFORMS[0]!;
}

/** "이미지로 다운로드" 한 장 세로 상한(px). undefined면 캡처 기본값(캔버스 한도) */
export function imageDownloadMaxPartHeight(id: DownloadPlatformId): number | undefined {
  return getDownloadPlatform(id).maxPartHeightPx;
}
