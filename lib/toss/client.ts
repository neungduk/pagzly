// 서버 전용. 클라이언트 컴포넌트에서 절대 import하지 말 것 (TOSS_SECRET_KEY 노출 위험).
if (typeof window !== "undefined") {
  throw new Error("lib/toss/client must not be imported in client bundle");
}

const TOSS_API_BASE = "https://api.tosspayments.com";

function getAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
  }
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function tossPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`토스 API 오류 (${path}): ${data?.message ?? res.statusText}`);
  }
  return data as T;
}

export type TossBillingKeyResponse = {
  billingKey: string;
  customerKey: string;
  card?: { number?: string; company?: string };
};

export async function issueBillingKey(authKey: string, customerKey: string) {
  return tossPost<TossBillingKeyResponse>("/v1/billing/authorizations/issue", {
    authKey,
    customerKey,
  });
}

export type TossPaymentResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
};

export async function chargeBillingKey(params: {
  billingKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
}) {
  const { billingKey, ...body } = params;
  return tossPost<TossPaymentResponse>(`/v1/billing/${billingKey}`, body);
}

export type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
};

export async function confirmPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  return tossPost<TossConfirmResponse>("/v1/payments/confirm", params);
}
