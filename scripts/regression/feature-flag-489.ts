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

    // 491 — privacy/terms 검수 문구 · label-check 하단 링크 (플래그 꺼짐 분기)
    {
      const privacy = read("app/privacy/page.tsx");
      const terms = read("app/terms/page.tsx");
      if (!/DETAIL_PAGE_ENABLED/.test(privacy) || !/labelCheckArticles|저장하지 않습니다/.test(privacy)) {
        f.push("491: privacy 검수 분기/저장 없음 문구 부족");
      }
      if (!/labelContactEmail/.test(privacy)) f.push("491: privacy 문의가 labelContactEmail 아님");
      {
        const labelPart = privacy.slice(privacy.indexOf("function labelCheckArticles"));
        if (/example\.com|you@|tjsmdejr@|contact@pagzly/i.test(labelPart)) {
          f.push("491: privacy 검수 분기에 임의 문의 주소");
        }
        // 2026-11-10: 문의 주소는 labelContactEmail() 우선, 없으면 공용 CONTACT_EMAIL(lib/contact) — 하드코딩 금지.
        if (!/contact \|\| CONTACT_EMAIL/.test(labelPart)) f.push("491: privacy 문의가 contact||CONTACT_EMAIL 아님");
        // 사진 읽기(OCR) 도입 이후: 외부 전송·국외 이전 고지가 있어야 하고, '전송하지 않습니다' 단정 금지.
        if (!/네이버클라우드/.test(labelPart) || !/Google LLC/.test(labelPart) || !/국외 이전/.test(labelPart)) {
          f.push("491: privacy 검수 분기에 OCR 위탁·국외 이전 고지 부족");
        }
        if (/외부 AI·OCR·분석 서비스로 전송하지 않습니다/.test(labelPart)) {
          f.push("491: privacy 검수 분기에 사실과 다른 '외부 전송 없음' 문구");
        }
      }
      if (!/DETAIL_PAGE_ENABLED/.test(terms) || !/법적 판단이 아닙니다/.test(terms)) {
        f.push("491: terms 검수 분기 부족");
      }
      const labelTerms = terms.slice(terms.indexOf("LABEL_CHECK_ARTICLES"));
      // 2026-11-10: 월 구독 방침 — 약관에 유료 구독·해지·환불 조항이 있어야 한다. 금액(₩)·토큰 팩은 약관에 넣지 않는다.
      if (!/유료 구독/.test(labelTerms) || !/해지/.test(labelTerms) || !/환불/.test(labelTerms)) {
        f.push("491: terms 검수 분기에 구독·해지·환불 조항 부족");
      }
      if (/토큰 팩|₩/.test(labelTerms)) {
        f.push("491: terms 검수 분기에 금액·토큰 팩 문구");
      }
      if (/Anthropic|DeepSeek|상세페이지 문구·이미지 자동 생성/.test(labelTerms)) {
        f.push("491: terms 검수 분기에 상세 AI 생성 문단");
      }
      {
        const footer = fs.existsSync(path.join(process.cwd(), "components/label-check/ui-511/LabelFooter.tsx"))
          ? fs.readFileSync(path.join(process.cwd(), "components/label-check/ui-511/LabelFooter.tsx"), "utf8")
          : "";
        const blob = labelPage + footer;
        if (!/href=\"\/privacy\"/.test(blob) || !/href=\"\/terms\"/.test(blob)) {
          f.push("491: label-check 하단 privacy/terms 링크 없음");
        }
      }
      if (/min-w-\[\d{3,}px\]/.test(labelPage)) f.push("491: label-check 고정 min-width(가로 넘침)");
    }
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED;
    else process.env.NEXT_PUBLIC_DETAIL_PAGE_ENABLED = prev;
  }

  return f;
}
