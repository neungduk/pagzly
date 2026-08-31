import { NextRequest, NextResponse } from "next/server";
import { getCreditPack } from "@/lib/cost/saas-pricing-config";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { confirmPayment } from "@/lib/toss/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as {
    packId?: string;
    orderId?: string;
    paymentKey?: string;
    amount?: number;
  };
  const { packId, orderId, paymentKey, amount } = body;

  if (!packId || !orderId || !paymentKey || amount == null) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const pack = getCreditPack(packId);
  if (!pack) {
    return NextResponse.json({ error: "invalid_pack" }, { status: 400 });
  }

  if (amount !== pack.priceKrw) {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  if (!orderId.includes(user.id)) {
    return NextResponse.json({ error: "forbidden_order_id" }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();

  const { data: existingPayment } = await serviceClient
    .from("payments")
    .select("status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingPayment?.status === "done") {
    return NextResponse.json({ error: "already_processed" }, { status: 409 });
  }

  try {
    const confirmed = await confirmPayment({ paymentKey, orderId, amount });

    if (confirmed.totalAmount !== pack.priceKrw) {
      console.error(
        `[billing/purchase-pack] amount mismatch after confirm: expected ${pack.priceKrw}, got ${confirmed.totalAmount}`,
      );
      return NextResponse.json({ error: "amount_mismatch_after_confirm" }, { status: 500 });
    }

    const { error: paymentError } = await serviceClient.from("payments").insert({
      user_id: user.id,
      toss_payment_key: confirmed.paymentKey,
      order_id: orderId,
      amount: pack.priceKrw,
      status: "done",
      purchase_type: "pack_purchase",
      item_id: packId,
      credits_granted: pack.tokens,
      confirmed_at: new Date().toISOString(),
    });

    if (paymentError) throw paymentError;

    const { data: newBalance, error: grantError } = await serviceClient.rpc("grant_credits", {
      p_user_id: user.id,
      p_amount: pack.tokens,
      p_reason: "pack_purchase",
      p_reference_id: orderId,
    });

    if (grantError) throw grantError;

    return NextResponse.json({ ok: true, packId, balance: newBalance });
  } catch (err) {
    console.error("[billing/purchase-pack] failed:", err);
    return NextResponse.json({ error: "purchase_failed" }, { status: 500 });
  }
}
