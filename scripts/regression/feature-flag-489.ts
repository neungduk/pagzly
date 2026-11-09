/**
 * 489 — 상세페이지 기능 플래그(기본 꺼짐). 코드 삭제 없이 UI·API 가드.
 */
import fs from "node:fs";
import path from "node:path";
import {
  DETAIL_PAGE_DISABLED_ERROR,
  isDetailPageEnabled,
} from "../../lib/feature-flags";
import { detailPageDisabledResponse } from "../../lib/detail-page-api-guard";
import { INTRO_ONE_LINE_486 } from "../../lib/label-check/types";

export const name = "기능플래그 489 — 상세 숨김·API 거절·복원 경로";

const GUARDED_ROUTES = [
  "app/api/generate/route.ts",
  "app/api/generate-backdrop/route.ts",
  "app/api/generate-lifestyle-shots/route.ts",
  "app/api/generate-social/route.ts",
  "app/api/enhance-image/route.ts",
  "app/api/canvas-ai-image/route.ts",
  "app/api/lifestyle-composite/route.ts",
  "app/api/patch-page/route.ts",
  "app/api/patch-section/route.ts",
  "app/api/scene-images/route.ts",
  "app/api/section-backdrops/route.ts",
  "app/api/info-backdrops/route.ts",
  "app/api/autofill-draft/route.ts",
  "app/api/protect-product-images/route.ts",
  "app/api/image-jobs/[id]/route.ts",
  "app/api/products/[id]/route.ts",
  "app/api/generations/route.ts",
  "app/api/generations/[id]/route.ts",
  "app/api/support-chat/route.ts",
  "app/api/proxy-image/route.ts",
  "app/api/storage/upload-url/route.ts",
  "app/api/storage/remove/route.ts",
  // 490 — 닫힌 상품 결제
  "app/api/billing/subscribe/route.ts",
  "app/api/billing/purchase-pack/route.ts",
] as const;

const KEEP_OPEN = [
  "app/api/label-check/route.ts",
  "app/api/billing/me/route.ts",
  "app/api/billing/renew/route.ts",
] as const;

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const prev = process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED;

  try {
    // ① 헬퍼: 기본 꺼짐 / "1"만 켜짐
    delete process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED;
    if (isDetailPageEnabled()) f.push("489: 기본값이 켜짐(꺼져야 함)");
    const off = detailPageDisabledResponse();
    if (!off) f.push("489: 꺼짐 시 거절 응답 null");
    else {
      if (off.status !== 503) f.push(`489: 거절 status ${off.status} ≠ 503`);
      const body = await off.json();
      if (body?.error !== DETAIL_PAGE_DISABLED_ERROR) {
        f.push(`489: 거절 본문 ${JSON.stringify(body)}`);
      }
      const text = JSON.stringify(body);
      if (/stack|ANTHROPIC|api[_-]?key|\/Users\//i.test(text)) {
        f.push("489: 거절 응답에 내부 정보 노출");
      }
    }

    process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED = "1";
    if (!isDetailPageEnabled()) f.push("489: env=1 인데 꺼짐");
    if (detailPageDisabledResponse() !== null) f.push("489: env=1 인데 거절됨");

    process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED = "true";
    if (isDetailPageEnabled()) f.push("489: env=true 는 켜지면 안 됨(오직 1)");
    process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED = "on";
    if (isDetailPageEnabled()) f.push("489: env=on 은 켜지면 안 됨(오직 1)");

    // 라우트 소스: 가드가 핸들러 상단(외부 호출 전)
    for (const rel of GUARDED_ROUTES) {
      const src = read(rel);
      if (!src.includes("detailPageDisabledResponse")) {
        f.push(`489: 가드 없음 — ${rel}`);
        continue;
      }
      const guardIdx = src.indexOf("detailPageDisabledResponse()");
      const paidHints = [
        "new Anthropic",
        "Anthropic(",
        "openai",
        "replicate",
        "usageGate(",
        "generateAutofillDraft(",
        "fetch(",
      ];
      for (const hint of paidHints) {
        const i = src.indexOf(hint);
        if (i >= 0 && guardIdx > i && /export async function/.test(src.slice(0, i))) {
          // 모듈 최상단 import의 Anthropic 등은 무시 — 핸들러 본문만
        }
      }
      // 핸들러 함수 시작 직후에 가드가 있는지
      const handlers = [...src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)[\s\S]*?\{/g)];
      for (const m of handlers) {
        const start = m.index ?? 0;
        const after = src.slice(start, start + 280);
        if (!after.includes("detailPageDisabledResponse")) {
          f.push(`489: 핸들러 상단 가드 없음 — ${rel} ${m[1]}`);
        }
      }
    }

    for (const rel of KEEP_OPEN) {
      const src = read(rel);
      if (src.includes("detailPageDisabledResponse")) {
        f.push(`489: 예외 라우트에 가드 있음 — ${rel}`);
      }
    }

    // 490 — 결제 라우트: 가드가 Toss 호출보다 앞(소스 순서 = 외부 결제 0회)
    for (const [rel, calls] of [
      ["app/api/billing/subscribe/route.ts", ["issueBillingKey", "chargeBillingKey"]],
      ["app/api/billing/purchase-pack/route.ts", ["confirmPayment"]],
    ] as const) {
      const src = read(rel);
      const g = src.indexOf("detailPageDisabledResponse()");
      if (g < 0) {
        f.push(`490: 결제 가드 없음 — ${rel}`);
        continue;
      }
      for (const fn of calls) {
        const i = src.indexOf(`${fn}(`);
        if (i < 0) f.push(`490: ${fn} 호출 위치 없음 — ${rel}`);
        else if (i < g) f.push(`490: ${fn}이 가드보다 앞 — ${rel}`);
      }
    }

    const cron = read("app/api/cron/cleanup-expired-images/route.ts");
    if (!/isDetailPageEnabled\(\)/.test(cron) || !/skipped:\s*true/.test(cron)) {
      f.push("489: cron no-op 가드 없음");
    }

    // UI 꺼짐 분기
    const page = read("app/page.tsx");
    if (!/LabelCheckLanding|PDF 검수 시작/.test(page)) f.push("489: 랜딩 검수 CTA 없음");
    if (!page.includes(INTRO_ONE_LINE_486) && !page.includes("INTRO_ONE_LINE_486")) {
      f.push("489: 소개 한 줄 재사용 없음");
    }
    if (!/DETAIL_PAGE_ENABLED/.test(page)) f.push("489: page 플래그 분기 없음");
    // 플래그 켜짐 경로에 기존 링크 유지(복원)
    if (!/href=\"\/create\"/.test(page) || !/상세페이지 만들기/.test(page)) {
      f.push("489: 플래그 켜짐용 /create·상세 CTA 소스 소실");
    }

    const mw = read("lib/supabase/middleware.ts");
    if (!/label-check/.test(mw) || !/isDetailPageEnabled/.test(mw)) {
      f.push("489: middleware 리다이렉트 없음");
    }
    const createLayout = read("app/create/layout.tsx");
    if (!/redirect\(\"\/label-check\"\)/.test(createLayout)) {
      f.push("489: create layout 리다이렉트 없음");
    }
    const onboardingLayout = read("app/onboarding/layout.tsx");
    if (!/label-check/.test(onboardingLayout)) f.push("489: onboarding layout 리다이렉트 없음");

    const rootLayout = read("app/layout.tsx");
    if (!/Pagzly · 화장품 표시사항 PDF 검수/.test(rootLayout)) {
      f.push("489: root 메타 검수 타이틀 없음");
    }

    const labelPage = read("app/label-check/page.tsx");
    if (!labelPage || labelPage.length < 20) f.push("489: /label-check 페이지 없음");
    const login = read("app/login/page.tsx");
    if (!login) f.push("489: 로그인 페이지 없음");

    // 가로 넘침 위험(검수 랜딩 분기) — 320/390/750 뷰포트 기준 고정 과폭 금지
    const lcStart = page.indexOf("function LabelCheckLanding");
    const lcEnd = page.indexOf("export default async function Home");
    const lcLanding = lcStart >= 0 && lcEnd > lcStart ? page.slice(lcStart, lcEnd) : "";
    if (!lcLanding) f.push("489: LabelCheckLanding 블록 없음");
    if (/min-w-\[\d{3,}px\]/.test(lcLanding)) f.push("489: 검수 랜딩 고정 min-width(320/390/750 위험)");
    if (/w-\[[8-9]\d{2,}px\]|w-\[[1-9]\d{3,}px\]/.test(lcLanding)) {
      f.push("489: 검수 랜딩 고정 폭 과다(750+)");
    }

    // label-check API·회귀 파일 가드 미적용
    const lcApi = read("app/api/label-check/route.ts");
    if (lcApi.includes("detailPageDisabledResponse")) f.push("489: label-check API 가드됨");
    if (!fs.existsSync("scripts/regression/label-check-483.ts")) {
      f.push("489: label-check 회귀 파일 소실");
    }

    // 노트 표
    const notes = read("review/489-notes.md");
    if (!/\/api\/generate/.test(notes) || !/유지/.test(notes)) {
      f.push("489: 489-notes 표 불충분");
    }
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED;
    else process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED = prev;
  }

  return f;
}
