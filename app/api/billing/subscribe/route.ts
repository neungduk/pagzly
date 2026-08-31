import { NextRequest, NextResponse } from "next/server";
import { getPricingTier, type PricingTierId } from "@/lib/cost/saas-pricing-config";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { chargeBillingKey, issueBillingKey } from "@/lib/toss/client";

const TIER_IDS: PricingTierId[] = ["starter", "growth", "pro"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as {
    tier?: string;
    customerKey?: string;
    authKey?: string;
  };
  const { tier, customerKey, authKey } = body;

  if (!tier || !customerKey || !authKey) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!TIER_IDS.includes(tier as PricingTierId)) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  if (customerKey !== user.id) {
    return NextResponse.json({ error: "forbidden_customer_key" }, { status: 403 });
  }

  const pricingTier = getPricingTier(tier as PricingTierId);
  const serviceClient = createServiceRoleClient();

  const { data: existingSubscription } = await serviceClient
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSubscription?.status === "active") {
    return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
  }

  try {
    const billing = await issueBillingKey(authKey, customerKey);

    const orderId = `sub_${customerKey}_${Date.now()}`;

    const payment = await chargeBillingKey({
      billingKey: billing.billingKey,
      customerKey,
      orderId,
      orderName: `Pagzly ${pricingTier.label} 구독`,
      amount: pricingTier.monthlyPriceKrw,
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: subscriptionError } = await serviceClient.from("subscriptions").upsert({
      user_id: customerKey,
      tier_id: tier,
      status: "active",
      toss_customer_key: customerKey,
      toss_billing_key: billing.billingKey,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_billing_at: periodEnd.toISOString(),
      failed_charge_count: 0,
      updated_at: now.toISOString(),
    });

    if (subscriptionError) throw subscriptionError;

    const { error: paymentError } = await serviceClient.from("payments").insert({
      user_id: customerKey,
      toss_payment_key: payment.paymentKey,
      order_id: orderId,
      amount: pricingTier.monthlyPriceKrw,
      status: "done",
      purchase_type: "subscription_initial",
      item_id: tier,
      credits_granted: pricingTier.monthlyCredits,
      confirmed_at: now.toISOString(),
    });

    if (paymentError) throw paymentError;

    const { data: newBalance, error: grantError } = await serviceClient.rpc("grant_credits", {
      p_user_id: customerKey,
      p_amount: pricingTier.monthlyCredits,
      p_reason: "subscription_grant",
      p_reference_id: orderId,
    });

    if (grantError) throw grantError;

    return NextResponse.json({ ok: true, tier, balance: newBalance });
  } catch (err) {
    console.error("[billing/subscribe] failed:", err);
    return NextResponse.json({ error: "subscribe_failed" }, { status: 500 });
  }
}
