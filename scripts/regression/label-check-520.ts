/**
 * 520 — 토스 미니앱 서버 준비(API base·CORS·한도) 정적·단위 가드
 */
import fs from "node:fs";
import path from "node:path";
import { labelApiUrl } from "../../lib/label-check/api-base-520";
import {
  allowedOrigin520,
  preflight520,
  withCors520,
} from "../../lib/label-check/cors-520";

export const name = "표시사항 520 — 토스 미니앱 API·CORS 준비";

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // 1) labelApiUrl
  {
    const envEmpty = {} as NodeJS.ProcessEnv;
    if (labelApiUrl("/api/label-check", envEmpty) !== "/api/label-check") {
      f.push("520: env 없을 때 path 변경됨");
    }
    if (labelApiUrl("not-api", envEmpty) !== "not-api") {
      f.push("520: /api/ 아닌 path 변경됨");
    }
    const a = labelApiUrl("/api/label-check", {
      NEXT_PUBLIC_LABEL_API_BASE: "https://pagzly.com",
    } as NodeJS.ProcessEnv);
    if (a !== "https://pagzly.com/api/label-check") f.push(`520: base 연결 실패 ${a}`);
    const b = labelApiUrl("/api/x", {
      NEXT_PUBLIC_LABEL_API_BASE: "https://pagzly.com/",
    } as NodeJS.ProcessEnv);
    if (b !== "https://pagzly.com/api/x") f.push(`520: trailing slash ${b}`);
  }

  // 2) 점검 흐름 fetch 감싸기(runs 제외)
  {
    const submit = read("lib/label-check/client-submit.ts");
    const ocr = read("lib/label-check/client-ocr-submit.ts");
    const law = read("components/label-check/LawBaselineClient516.tsx");
    const bare = /fetch\(\s*[`'"]\/api\//;
    if (bare.test(submit)) f.push("520: client-submit 에 맨 fetch(/api/");
    if (bare.test(ocr)) f.push("520: client-ocr-submit 에 맨 fetch(/api/");
    if (bare.test(law)) f.push("520: LawBaseline 에 맨 fetch(/api/");
    if (!submit.includes("labelApiUrl") || !ocr.includes("labelApiUrl") || !law.includes("labelApiUrl")) {
      f.push("520: labelApiUrl 미사용");
    }
  }

  // 3) CORS allow / deny
  {
    const off = { LABEL_TOSS_ENABLED: "" } as NodeJS.ProcessEnv;
    if (allowedOrigin520("https://my-app.apps.tossmini.com", off) !== null) {
      f.push("520: 꺼진 상태인데 Origin 허용");
    }
    const on = { LABEL_TOSS_ENABLED: "1" } as NodeJS.ProcessEnv;
    if (allowedOrigin520("https://my-app.apps.tossmini.com", on) !== "https://my-app.apps.tossmini.com") {
      f.push("520: tossmini Origin 미허용");
    }
    if (allowedOrigin520("https://evil.com", on) !== null) f.push("520: evil.com 허용됨");
    if (allowedOrigin520("https://apps.tossmini.com.evil.com", on) !== null) {
      f.push("520: evil suffix 허용됨");
    }
    if (allowedOrigin520("http://my-app.apps.tossmini.com", on) !== null) {
      f.push("520: http toss 허용됨");
    }
    const extra = {
      LABEL_TOSS_ENABLED: "1",
      LABEL_CORS_ORIGINS: "https://sandbox.example.com",
    } as NodeJS.ProcessEnv;
    if (allowedOrigin520("https://sandbox.example.com", extra) !== "https://sandbox.example.com") {
      f.push("520: LABEL_CORS_ORIGINS 미반영");
    }
    if (allowedOrigin520("https://other.example.com", extra) !== null) {
      f.push("520: 목록 밖 Origin 허용");
    }
  }

  // 4) * / Credentials 금지
  {
    const corsSrc = read("lib/label-check/cors-520.ts");
    const ocrRoute = read("app/api/label-check/ocr/route.ts");
    const lcRoute = read("app/api/label-check/route.ts");
    const baseRoute = read("app/api/law-watch/baseline/route.ts");
    const blob = corsSrc + ocrRoute + lcRoute + baseRoute;
    if (/Access-Control-Allow-Origin["'\s:]*\*/.test(blob) || /Allow-Origin:\s*\*/.test(blob)) {
      f.push("520: Allow-Origin *");
    }
    if (/Access-Control-Allow-Credentials/.test(blob) && !blob.includes("절대 금지") && !blob.includes("Credentials 절대")) {
      // cors-520 deletes credentials — comment ok; setting header is not
      if (/headers\.set\(\s*["']Access-Control-Allow-Credentials/.test(blob)) {
        f.push("520: Allow-Credentials 설정");
      }
    }
    if (/headers\.set\(\s*["']Access-Control-Allow-Credentials/.test(blob)) {
      f.push("520: Allow-Credentials set");
    }
  }

  // 5) 프리플라이트
  {
    const on = { LABEL_TOSS_ENABLED: "1" } as NodeJS.ProcessEnv;
    const req = new Request("https://pagzly.com/api/label-check", {
      method: "OPTIONS",
      headers: { Origin: "https://my-app.apps.tossmini.com" },
    });
    const res = preflight520(req, on);
    if (res.status !== 204) f.push("520: preflight status");
    if (res.headers.get("Access-Control-Allow-Origin") !== "https://my-app.apps.tossmini.com") {
      f.push("520: preflight ACAO");
    }
    if (res.headers.get("Access-Control-Allow-Methods") !== "GET, POST, OPTIONS") {
      f.push("520: preflight methods");
    }
    if (res.headers.get("Access-Control-Allow-Headers") !== "Content-Type") {
      f.push("520: preflight headers");
    }
    if (res.headers.get("Access-Control-Max-Age") !== "86400") f.push("520: preflight max-age");
    const denied = preflight520(
      new Request("https://pagzly.com/api/label-check", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.com" },
      }),
      on,
    );
    if (denied.headers.get("Access-Control-Allow-Origin")) {
      f.push("520: 거부 Origin에 CORS 헤더");
    }
  }

  // 6) 에러 응답에도 CORS
  {
    const on = { LABEL_TOSS_ENABLED: "1" } as NodeJS.ProcessEnv;
    const req = new Request("https://pagzly.com/api/label-check/ocr", {
      headers: { Origin: "https://my-app.apps.tossmini.com" },
    });
    const err = withCors520(
      req,
      Response.json({ error: "x", code: "OCR_LIMIT", limitKind: "daily" }, { status: 429 }),
      on,
    );
    if (err.status !== 429) f.push("520: withCors status 유실");
    if (err.headers.get("Access-Control-Allow-Origin") !== "https://my-app.apps.tossmini.com") {
      f.push("520: 429에 CORS 없음");
    }
    const offReq = new Request("https://pagzly.com/api/x", {
      headers: { Origin: "https://my-app.apps.tossmini.com" },
    });
    const bare = withCors520(offReq, Response.json({}, { status: 503 }), {
      LABEL_TOSS_ENABLED: "",
    } as NodeJS.ProcessEnv);
    if (bare.headers.get("Access-Control-Allow-Origin")) {
      f.push("520: 꺼진 상태인데 CORS 헤더");
    }
  }

  // 7) 마이그레이션
  {
    const sql = read("supabase/migrations/20261111130000_label_toss_daily.sql");
    if (!/enable row level security/i.test(sql)) f.push("520: RLS 없음");
    if (!/security definer/i.test(sql)) f.push("520: security definer 없음");
    if (!/search_path/i.test(sql)) f.push("520: search_path 없음");
    if (!/label_toss_consume/.test(sql)) f.push("520: consume 함수 없음");
    if (!/service_role/.test(sql)) f.push("520: service_role grant 없음");
  }

  // 라우트 OPTIONS·withCors
  {
    for (const rel of [
      "app/api/label-check/route.ts",
      "app/api/label-check/ocr/route.ts",
      "app/api/law-watch/baseline/route.ts",
    ]) {
      const s = read(rel);
      if (!s.includes("OPTIONS") || !s.includes("preflight520")) f.push(`520: ${rel} OPTIONS`);
      if (!s.includes("withCors520")) f.push(`520: ${rel} withCors`);
    }
  }

  return f;
}

if (require.main === module) {
  run().then((fails) => {
    if (fails.length) {
      console.error(fails.join("\n"));
      process.exit(1);
    }
    console.log("ok", name);
  });
}
