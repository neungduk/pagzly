/**
 * 109차 — 히어로 브랜드 로고 / 타이포 워드마크 판정.
 * 심볼·엠블럼 AI 생성 금지. 로고 파일이 없으면 브랜드명 텍스트 조판만.
 */

export type HeroBrandMarkKind = "logo" | "wordmark" | "none";

export type HeroBrandMarkScript = "latin" | "cjk" | "mixed";

export type HeroBrandMarkDecision = {
  kind: HeroBrandMarkKind;
  /** 표시용 브랜드명 (워드마크일 때). 로고만 있으면 빈 문자열 */
  displayName: string;
  script: HeroBrandMarkScript;
};

/** 영문(라틴) 위주인지 — 소문자+넓은 자간 조판 분기 */
export function detectBrandScript(name: string): HeroBrandMarkScript {
  const trimmed = name.trim();
  if (!trimmed) return "latin";
  const letters = trimmed.replace(/[\s\-_.&']/g, "");
  if (!letters) return "latin";
  const cjk = letters.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g)?.join("")
    .length ?? 0;
  const latin = letters.match(/[A-Za-z]/g)?.join("").length ?? 0;
  if (cjk > 0 && latin > 0) return "mixed";
  if (cjk > 0) return "cjk";
  return "latin";
}

/** 브랜드명이 없거나 상품명과 동일하면 워드마크 미표시 */
export function shouldShowBrandWordmark(
  brandName: string | null | undefined,
  productName: string | null | undefined,
): boolean {
  const brand = (brandName ?? "").trim();
  if (!brand) return false;
  const product = (productName ?? "").trim();
  if (!product) return true;
  return brand.toLowerCase() !== product.toLowerCase();
}

/**
 * 로고 URL이 있으면 로고 우선.
 * 없으면 브랜드명 워드마크 (상품명과 다를 때만).
 */
export function resolveHeroBrandMark(opts: {
  logoUrl?: string | null;
  brandName?: string | null;
  productName?: string | null;
}): HeroBrandMarkDecision {
  const logo = (opts.logoUrl ?? "").trim();
  if (logo) {
    return {
      kind: "logo",
      displayName: (opts.brandName ?? "").trim(),
      script: detectBrandScript(opts.brandName ?? ""),
    };
  }
  const brand = (opts.brandName ?? "").trim();
  if (!shouldShowBrandWordmark(brand, opts.productName)) {
    return { kind: "none", displayName: "", script: "latin" };
  }
  const script = detectBrandScript(brand);
  return {
    kind: "wordmark",
    displayName: script === "latin" ? brand.toLowerCase() : brand,
    script,
  };
}

/** 미리보기용 Tailwind 클래스 (영문 vs 한글) */
export function heroWordmarkClassName(script: HeroBrandMarkScript): string {
  if (script === "cjk" || script === "mixed") {
    return "font-heading text-[1.35rem] font-semibold tracking-[-0.02em] text-white sm:text-[1.5rem]";
  }
  return "font-mono text-[1.15rem] font-semibold lowercase tracking-[0.28em] text-white sm:text-[1.25rem]";
}

/**
 * 119차 — 워드마크 전용 로컬 스크림 래퍼.
 * 97차 히어로 전체 그라디언트(하단→상단 fade)와 분리: 상단 밝은 사진에서도 대비 확보.
 */
export function heroWordmarkWrapClassName(): string {
  return "absolute left-1/2 top-5 z-30 max-w-[70%] -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 backdrop-blur-[2px] sm:top-7";
}

/** export HTML용 인라인 스타일 */
export function heroWordmarkInlineStyle(script: HeroBrandMarkScript): string {
  if (script === "cjk" || script === "mixed") {
    return "font-family:var(--pagzly-heading,sans-serif);font-size:1.35rem;font-weight:600;letter-spacing:-0.02em;color:#FAF8F3;margin:0";
  }
  return "font-family:var(--pagzly-mono,monospace);font-size:1.15rem;font-weight:600;letter-spacing:0.28em;text-transform:lowercase;color:#FAF8F3;margin:0";
}

/** export — 워드마크 로컬 스크림 (히어로 전체 그라디언트와 별개) */
export function heroWordmarkWrapInlineStyle(): string {
  return "position:absolute;top:20px;left:50%;transform:translateX(-50%);z-index:30;max-width:70%;display:flex;align-items:center;justify-content:center;padding:8px 16px;border-radius:9999px;background:rgba(0,0,0,0.45);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)";
}

/** export HTML — 로고/워드마크 마크업 (없으면 빈 문자열) */
export function buildHeroBrandMarkHtml(opts: {
  logoUrl?: string | null;
  brandName?: string | null;
  productName?: string | null;
}): string {
  const decision = resolveHeroBrandMark(opts);
  if (decision.kind === "none") return "";

  const logoWrap =
    "position:absolute;top:20px;left:50%;transform:translateX(-50%);z-index:25;max-width:28%;display:flex;align-items:center;justify-content:center;padding:8px 12px";

  if (decision.kind === "logo") {
    const alt = decision.displayName
      ? `${escapeHtml(decision.displayName)} 로고`
      : "브랜드 로고";
    return `<div style="${logoWrap}" data-hero-brand-mark="logo">
      <img src="${escapeHtml(opts.logoUrl!.trim())}" alt="${alt}" style="max-width:100%;max-height:64px;width:auto;height:auto;object-fit:contain;display:block"/>
    </div>`;
  }

  return `<div style="${heroWordmarkWrapInlineStyle()}" data-hero-brand-mark="wordmark" data-wordmark-scrim="local">
    <p style="${heroWordmarkInlineStyle(decision.script)}" data-wordmark-script="${decision.script}">${escapeHtml(decision.displayName)}</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
