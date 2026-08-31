import { NextResponse } from "next/server";
import { getPricingTier, type PricingTierId } from "@/lib/cost/saas-pricing-config";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [{ data: creditRow }, { data: subscription }] = await Promise.all([
    supabase.from("user_credits").select("balance").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("tier_id, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const balance = creditRow?.balance ?? 0;
  const activeTier =
    subscription?.status === "active" && subscription.tier_id
      ? (subscription.tier_id as PricingTierId)
      : null;

  return NextResponse.json({
    balance,
    activeTier,
    activeTierLabel: activeTier ? getPricingTier(activeTier).label : null,
  });
}
