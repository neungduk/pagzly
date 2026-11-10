/**
 * 508 — OCR API. 원본 이미지·응답 원문 로그/저장 금지.
 * 서버리스 일일 limiter는 인스턴스 메모리라 약한 보호 — 월 합계(label_ocr_consume)가 본 보호장치.
 */
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SlidingWindowLimiter } from "@/lib/rate-limit";
import {
  ERR_OCR_DAILY_LIMIT_509,
  ERR_OCR_UNAVAILABLE_508,
  OCR_MAX_DURATION_SEC_508,
} from "@/lib/label-check/ocr/constants";
import {
  isOcrConfigured508,
  ocrDailyLimit508,
  ocrVendorNotice508,
  pickProvider508,
} from "@/lib/label-check/ocr/provider";
import { runOcrBatch508 } from "@/lib/label-check/ocr/run-ocr-batch";
import { labelCheckClientIp } from "@/lib/label-check/safe-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * 509 — Hobby Fluid maxDuration 최대 300s. 호출당 8s·동시 4·조각 상한(CLOVA6/Google8)에 맞춰 30.
 * Next는 리터럴만 허용.
 */
export const maxDuration = 30;

void OCR_MAX_DURATION_SEC_508;

const ocrDailyLimiter = new SlidingWindowLimiter([
  { name: "day", windowMs: 24 * 60 * 60 * 1000, max: 30 },
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const market = url.searchParams.get("market")?.toUpperCase() === "US" ? "US" : "KR";
  const picked = pickProvider508(market);
  return Response.json({
    available: Boolean(picked),
    market,
    provider: picked?.id ?? null,
    tileHeightPx: picked?.tileHeightPx ?? 2400,
    fallbackFromClova: Boolean(picked?.fallbackFromClova),
    notice: ocrVendorNotice508(market, picked),
  });
}

export async function POST(req: Request) {
  try {
    if (!isOcrConfigured508()) {
      return Response.json(
        {
          error: "사진에서 글자 읽기가 꺼져 있어요. 문구 붙여넣기로 점검해 주세요.",
          code: "OCR_OFF",
          available: false,
        },
        { status: 503 },
      );
    }

    const supabaseUser = await createClient();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    const ip = labelCheckClientIp(req.headers);
    const dailyMax = ocrDailyLimit508(Boolean(user));
    const dayKey = user ? `ocr-u:${user.id}` : `ocr-ip:${ip}`;
    const dayLim = new SlidingWindowLimiter([
      { name: "day", windowMs: 24 * 60 * 60 * 1000, max: dailyMax },
    ]);
    const rate = dayLim.check(dayKey);
    const rate2 = ocrDailyLimiter.check(dayKey);
    if (!rate.allowed || !rate2.allowed) {
      return Response.json(
        { error: ERR_OCR_DAILY_LIMIT_509, code: "OCR_LIMIT", limitKind: "daily" },
        { status: 429 },
      );
    }

    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 4.5 * 1024 * 1024) {
      return Response.json({ error: "요청이 너무 큽니다.", code: "TOO_LARGE" }, { status: 400 });
    }
    let body: { imagesBase64?: string[]; tileOffsetY?: number[]; market?: string };
    try {
      body = JSON.parse(raw) as {
        imagesBase64?: string[];
        tileOffsetY?: number[];
        market?: string;
      };
    } catch {
      return Response.json(
        { error: "요청 형식이 올바르지 않습니다.", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const market = body.market?.toUpperCase() === "US" ? "US" : "KR";
    if (!pickProvider508(market)) {
      return Response.json(
        {
          error: "이 판매 국가에서는 사진 읽기가 꺼져 있어요. 문구 붙여넣기로 점검해 주세요.",
          code: "OCR_OFF",
        },
        { status: 503 },
      );
    }

    let service;
    try {
      service = createServiceRoleClient();
    } catch {
      console.warn("[label-ocr] service-role-missing");
      return Response.json({ error: ERR_OCR_UNAVAILABLE_508, code: "SERVER" }, { status: 503 });
    }

    const out = await runOcrBatch508(
      {
        imagesBase64: body.imagesBase64 || [],
        tileOffsetY: body.tileOffsetY,
        market,
      },
      { supabase: service },
    );

    if (!out.ok) {
      const status =
        out.code === "OCR_LIMIT"
          ? 429
          : out.code === "OCR_OFF"
            ? 503
            : out.code === "VISION" || out.code === "OCR_TIMEOUT"
              ? 502
              : 400;
      return Response.json(
        {
          error: out.error,
          code: out.code,
          ...(out.limitKind ? { limitKind: out.limitKind } : {}),
        },
        { status },
      );
    }

    return Response.json({
      text: out.text,
      rawText: out.rawText,
      corrections: out.corrections,
      avgConfidence: out.avgConfidence,
      netContents: out.netContents,
      netContentConflict: out.netContentConflict,
      conflictFinding: out.conflictFinding ?? null,
      provider: out.providerId,
      fallbackFromClova: Boolean(out.fallbackFromClova),
    });
  } catch {
    console.warn("[label-ocr] failed");
    return Response.json({ error: ERR_OCR_UNAVAILABLE_508, code: "SERVER" }, { status: 500 });
  }
}
