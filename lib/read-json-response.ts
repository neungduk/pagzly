export const GENERATE_DELAYED_MESSAGE = "생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";

/**
 * 504 등 플랫폼 오류는 JSON이 아닌 평문 본문("An error occurred…")을 돌려준다.
 * res.json()을 그대로 쓰면 파싱 에러 원문이 사용자 화면에 노출되므로 null로 흡수한다.
 */
export async function readJsonResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
