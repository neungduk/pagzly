import { NextRequest, NextResponse } from "next/server";
import {
  getPriceForCycle,
  getPricingTier,
  getTokensForCycle,
  type BillingCycle,
  type PricingTierId,
} from "@/lib/cost/saas-pricing-config";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { chargeBillingKey, issueBillingKey } from "@/lib/toss/client";

const TIER_IDS: PricingTierId[] = ["starter", "growth", "pro"];

function parseBillingCycle(raw: unknown): BillingCycle | null {
  if (raw == null || raw === "") return "monthly";
  if (raw === "monthly" || raw === "annual") return raw;
  return null;
}

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
    billingCycle?: string;
  };
  const { tier, customerKey, authKey } = body;
  const billingCycle = parseBillingCycle(body.billingCycle);

  if (!tier || !customerKey || !authKey) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (billingCycle == null) {
    return NextResponse.json({ error: "invalid_billing_cycle" }, { status: 400 });
  }

  if (!TIER_IDS.includes(tier as PricingTierId)) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  if (customerKey !== user.id) {
    return NextResponse.json({ error: "forbidden_customer_key" }, { status: 403 });
  }

  const pricingTier = getPricingTier(tier as PricingTierId);
  const amount = getPriceForCycle(pricingTier, billingCycle);
  const tokens = getTokensForCycle(pricingTier, billingCycle);
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
      orderName: `Pagzly ${pricingTier.label} ${billingCycle === "annual" ? "연간" : ""} 구독`.trim(),
      amount,
    });

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const { error: subscriptionError } = await serviceClient.from("subscriptions").upsert({
      user_id: customerKey,
      tier_id: tier,
      status: "active",
      toss_customer_key: customerKey,
      toss_billing_key: billing.billingKey,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_billing_at: periodEnd.toISOString(),
      billing_cycle: billingCycle,
      failed_charge_count: 0,
      updated_at: now.toISOString(),
    });

    if (subscriptionError) throw subscriptionError;

    const { error: paymentError } = await serviceClient.from("payments").insert({
      user_id: customerKey,
      toss_payment_key: payment.paymentKey,
      order_id: orderId,
      amount,
      status: "done",
      purchase_type: "subscription_initial",
      item_id: tier,
      credits_granted: tokens,
      confirmed_at: now.toISOString(),
    });

    if (paymentError) throw paymentError;

    const { data: newBalance, error: grantError } = await serviceClient.rpc("grant_credits", {
      p_user_id: customerKey,
      p_amount: tokens,
      p_reason: "subscription_grant",
      p_reference_id: orderId,
    });

    if (grantError) throw grantError;

    return NextResponse.json({ ok: true, tier, balance: newBalance, billingCycle });
  } catch (err) {
    console.error("[billing/subscribe] failed:", err);
    return NextResponse.json({ error: "subscribe_failed" }, { status: 500 });
  }
}
