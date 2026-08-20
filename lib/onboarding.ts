import type { SupabaseClient } from "@supabase/supabase-js";

export const BUSINESS_TYPE_OPTIONS = [
  "위탁판매 셀러",
  "자사 브랜드 운영",
  "기업 소속 마케터·MD·디자이너",
  "상세페이지 제작 대행사·프리랜서",
  "창업 준비 중",
] as const;

export const MONTHLY_VOLUME_OPTIONS = [
  "1개 이하",
  "2~4개",
  "5~10개",
  "10개 이상",
] as const;

export const REFERRAL_SOURCE_OPTIONS = [
  "구글검색",
  "네이버검색",
  "AI챗봇·검색도구",
  "강의·인플루언서",
  "유튜브",
  "인스타그램",
  "커뮤니티·카페후기",
  "지인추천",
  "기타",
] as const;

export type OnboardingAnswers = {
  business_type: (typeof BUSINESS_TYPE_OPTIONS)[number];
  monthly_volume: (typeof MONTHLY_VOLUME_OPTIONS)[number];
  referral_source: (typeof REFERRAL_SOURCE_OPTIONS)[number];
  store_url: string | null;
};

export async function hasCompletedOnboarding(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_onboarding")
    .select("completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[onboarding] 조회 실패", error.message);
    return false;
  }

  return Boolean(data?.completed_at);
}
