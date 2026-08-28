export type DownloadPlatformId = "smartstore" | "coupang" | "toss" | "ohouse";

export type DownloadPlatform = {
  id: DownloadPlatformId;
  label: string;
  width: number;
  hint: string;
};

/** 마켓별 상세 이미지 권장 가로(px) — 후커블·GENCY 등 다채널 분할 다운로드 대응 */
export const DOWNLOAD_PLATFORMS: DownloadPlatform[] = [
  { id: "smartstore", label: "스마트스토어", width: 860, hint: "네이버 권장 860px" },
  { id: "coupang", label: "쿠팡", width: 780, hint: "쿠팡 상세 780px" },
  { id: "toss", label: "토스쇼핑", width: 750, hint: "모바일 표준 750px" },
  { id: "ohouse", label: "오늘의집", width: 750, hint: "자사몰·오늘의집 750px" },
];

export function getDownloadPlatform(id: DownloadPlatformId): DownloadPlatform {
  return DOWNLOAD_PLATFORMS.find((p) => p.id === id) ?? DOWNLOAD_PLATFORMS[0]!;
}
