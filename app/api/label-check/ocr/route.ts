/**
 * 508 — OCR API. 원본 이미지·Vision 응답 원문 로그/저장 금지.
 * 서버리스 일일 limiter는 인스턴스 메모리라 약한 보호 — 월 합계(label_ocr_consume)가 본 보호장치.
 */
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SlidingWindowLimiter } from "@/lib/rate-limit";
import {
  ERR_OCR_LIMIT_508,
  ERR_OCR_UNAVAILABLE_508,
  OCR_MAX_DURATION_SEC_508,
  NOTICE_OCR_TRANSFER_508,
} from "@/lib/label-check/ocr/constants";
import { isOcrConfigured508, ocrDailyLimit508 } from "@/lib/label-check/ocr/provider";
import { runOcrBatch508 } from "@/lib/label-check/ocr/run-ocr-batch";
import { labelCheckClientIp } from "@/lib/label-check/safe-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Hobby 한도 이내 — Next는 리터럴만 허용 */
export const maxDuration = 10;

// 일일 OCR 시도(약한 보호). 주석: 서버리스 인스턴스마다 메모리 분리.
const ocrDailyLimiter = new SlidingWindowLimiter([
  { name: "day", windowMs: 24 * 60 * 60 * 1000, max: 30 },
]);

void OCR_MAX_DURATION_SEC_508;
void NOTICE_OCR_TRANSFER_508;

export async function GET() {
  return Response.json({
    available: isOcrConfigured508(),
    notice: NOTICE_OCR_TRANSFER_508,
  });
}

export async function POST(req: Request) {
  try {
    if (!isOcrConfigured508()) {
      return Response.json(
        { error: "사진에서 글자 읽기가 꺼져 있어요. 문구 붙여넣기로 점검해 주세요.", code: "OCR_OFF", available: false },
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
    // 한도 숫자를 룰에 반영하기 위해 임시 limiter
    const dayLim = new SlidingWindowLimiter([
      { name: "day", windowMs: 24 * 60 * 60 * 1000, max: dailyMax },
    ]);
    // 공유 싱글톤에도 기록(약한 합산)
    const rate = dayLim.check(dayKey);
    const rate2 = ocrDailyLimiter.check(dayKey);
    if (!rate.allowed || !rate2.allowed) {
      return Response.json(
        { error: ERR_OCR_LIMIT_508, code: "OCR_LIMIT" },
        { status: 429 },
      );
    }

    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 4.5 * 1024 * 1024) {
      return Response.json({ error: "요청이 너무 큽니다.", code: "TOO_LARGE" }, { status: 400 });
    }
    let body: { imagesBase64?: string[]; tileOffsetY?: number[] };
    try {
      body = JSON.parse(raw) as { imagesBase64?: string[]; tileOffsetY?: number[] };
    } catch {
      return Response.json({ error: "요청 형식이 올바르지 않습니다.", code: "BAD_REQUEST" }, { status: 400 });
    }

    // service role — 사용량 RPC
    let service;
    try {
      service = createServiceRoleClient();
    } catch {
      console.warn("[label-ocr] service-role-missing");
      return Response.json({ error: ERR_OCR_UNAVAILABLE_508, code: "SERVER" }, { status: 503 });
    }

    const out = await runOcrBatch508(
      { imagesBase64: body.imagesBase64 || [], tileOffsetY: body.tileOffsetY },
      { supabase: service },
    );

    if (!out.ok) {
      const status =
        out.code === "OCR_LIMIT" ? 429 : out.code === "OCR_OFF" ? 503 : out.code === "VISION" ? 502 : 400;
      return Response.json({ error: out.error, code: out.code }, { status });
    }

    // 응답에 base64·원본 이미지 없음. rawText는 고객 확인용(저장 안 함).
    return Response.json({
      text: out.text,
      rawText: out.rawText,
      corrections: out.corrections,
      avgConfidence: out.avgConfidence,
      netContents: out.netContents,
      netContentConflict: out.netContentConflict,
      conflictFinding: out.conflictFinding ?? null,
    });
  } catch {
    console.warn("[label-ocr] failed");
    return Response.json({ error: ERR_OCR_UNAVAILABLE_508, code: "SERVER" }, { status: 500 });
  }
}
