import { NextRequest, NextResponse } from "next/server";
import {
  getPriceForCycle,
  getPricingTier,
  getTokensForCycle,
  type BillingCycle,
  type PricingTierId,
} from "@/lib/cost/saas-pricing-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { chargeBillingKey } from "@/lib/toss/client";

function asBillingCycle(raw: unknown): BillingCycle {
  return raw === "annual" ? "annual" : "monthly";
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();
  const now = new Date();

  const { data: dueSubscriptions, error: listError } = await serviceClient
    .from("subscriptions")
    .select(
      "user_id, tier_id, toss_customer_key, toss_billing_key, current_period_end, failed_charge_count, billing_cycle",
    )
    .eq("status", "active")
    .lte("next_billing_at", now.toISOString());

  if (listError) {
    console.error("[billing/renew] failed to list due subscriptions:", listError);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  const summary = { processed: 0, succeeded: 0, failed: 0, suspended: 0 };

  for (const sub of dueSubscriptions ?? []) {
    summary.processed += 1;
    const tier = getPricingTier(sub.tier_id as PricingTierId);
    const billingCycle = asBillingCycle(sub.billing_cycle);
    const amount = getPriceForCycle(tier, billingCycle);
    const tokens = getTokensForCycle(tier, billingCycle);
    const periodEnd = new Date(sub.current_period_end ?? now);
    const orderId = `renew_${sub.user_id}_${periodEnd.getTime()}`;

    try {
      const { data: existingPayment } = await serviceClient
        .from("payments")
        .select("status")
        .eq("order_id", orderId)
        .maybeSingle();
      if (existingPayment?.status === "done") continue;

      if (!sub.toss_billing_key) throw new Error("no_billing_key");

      const payment = await chargeBillingKey({
        billingKey: sub.toss_billing_key,
        customerKey: sub.toss_customer_key,
        orderId,
        orderName: `Pagzly ${tier.label} ${billingCycle === "annual" ? "연간" : ""} 구독 갱신`.trim(),
        amount,
      });

      const newPeriodEnd = new Date(now);
      if (billingCycle === "annual") {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      await serviceClient
        .from("subscriptions")
        .update({
          current_period_start: now.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          next_billing_at: newPeriodEnd.toISOString(),
          failed_charge_count: 0,
          updated_at: now.toISOString(),
        })
        .eq("user_id", sub.user_id);

      await serviceClient.from("payments").insert({
        user_id: sub.user_id,
        toss_payment_key: payment.paymentKey,
        order_id: orderId,
        amount,
        status: "done",
        purchase_type: "subscription_renewal",
        item_id: sub.tier_id,
        credits_granted: tokens,
        confirmed_at: now.toISOString(),
      });

      await serviceClient.rpc("grant_credits", {
        p_user_id: sub.user_id,
        p_amount: tokens,
        p_reason: "subscription_grant",
        p_reference_id: orderId,
      });

      summary.succeeded += 1;
    } catch (err) {
      console.error(`[billing/renew] charge failed for user=${sub.user_id}:`, err);
      const newFailedCount = (sub.failed_charge_count ?? 0) + 1;
      const shouldSuspend = newFailedCount >= 3;

      await serviceClient
        .from("subscriptions")
        .update({
          failed_charge_count: newFailedCount,
          status: shouldSuspend ? "past_due" : "active",
          updated_at: now.toISOString(),
        })
        .eq("user_id", sub.user_id);

      await serviceClient.from("payments").insert({
        user_id: sub.user_id,
        order_id: `renew_fail_${sub.user_id}_${Date.now()}`,
        amount,
        status: "failed",
        purchase_type: "subscription_renewal",
        item_id: sub.tier_id,
      });

      summary.failed += 1;
      if (shouldSuspend) summary.suspended += 1;
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
