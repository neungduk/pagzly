import type { DetailSection } from "@/lib/types/generate";

export type InstagramFeedSlide = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  kind: "cover" | "feature" | "cta";
};

export type InstagramSlideOverride = {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  imageIndex?: number;
};

const FEED_SIZE = 1080;

/** lifestyle-ai 경로를 우선해 피드에 사람·장면 컷을 먼저 쓴다. */
export function orderImagesForFeed(imageUrls: string[], imagePaths?: string[]): string[] {
  if (!imagePaths?.length || imagePaths.length !== imageUrls.length) return imageUrls;
  const indexed = imageUrls.map((url, i) => ({
    url,
    path: imagePaths[i] ?? "",
    i,
  }));
  const lifestyle = indexed.filter((x) => /lifestyle-ai/i.test(x.path));
  const studio = indexed.filter((x) => !/lifestyle-ai/i.test(x.path));
  return [...lifestyle, ...studio].map((x) => x.url);
}

function pickText(section: DetailSection): { title: string; body?: string } | null {
  if (section.type === "hero") {
    return { title: section.headline, body: section.subheadline };
  }
  if (section.type === "image_text") {
    const title = section.layout === "callout" && section.callout
      ? section.callout
      : section.heading;
    return { title, body: section.body };
  }
  if (section.type === "checklist") {
    return { title: section.heading, body: section.items.slice(0, 3).join(" · ") };
  }
  if (section.type === "highlight_box") {
    const card = section.cards[0];
    return card ? { title: card.title, body: card.body } : { title: section.heading };
  }
  if (section.type === "brand_story") {
    return { title: section.heading, body: section.body?.slice(0, 80) };
  }
  if (section.type === "step_card" && section.steps[0]) {
    return {
      title: section.heading,
      body: section.steps.map((s) => s.title).slice(0, 3).join(" → "),
    };
  }
  if (section.type === "stat_infographic" && section.metrics[0]) {
    const m = section.metrics[0];
    return { title: section.heading, body: `${m.label} ${m.value}` };
  }
  if (section.type === "cta_price") {
    return {
      title: `₩${section.price.toLocaleString("ko-KR")}`,
      body: section.targetCustomer ?? "지금 바로 확인하세요",
    };
  }
  return null;
}

function resolveUrl(imageUrls: string[], index: number | undefined): string {
  if (typeof index === "number" && imageUrls[index]) return imageUrls[index];
  return imageUrls[0] ?? "";
}

export function mergeFeedSlides(
  base: InstagramFeedSlide[],
  overrides: Record<string, InstagramSlideOverride>,
  imageUrls: string[],
): InstagramFeedSlide[] {
  return base.map((slide) => {
    const o = overrides[slide.id];
    if (!o) return slide;
    const imageUrl =
      o.imageUrl ??
      (typeof o.imageIndex === "number" ? imageUrls[o.imageIndex] : undefined) ??
      slide.imageUrl;
    return {
      ...slide,
      title: o.title ?? slide.title,
      subtitle: o.subtitle ?? slide.subtitle,
      imageUrl,
    };
  });
}

/** 상세페이지 섹션·사진으로 인스타 1:1 피드 슬라이드 기획 (최대 7장). */
export function buildInstagramFeedSlides(opts: {
  productName: string;
  brandName?: string | null;
  sections: DetailSection[];
  imageUrls: string[];
  imagePaths?: string[];
}): InstagramFeedSlide[] {
  const { productName, brandName, sections } = opts;
  const imageUrls = orderImagesForFeed(opts.imageUrls, opts.imagePaths);
  if (imageUrls.length === 0) return [];

  const slides: InstagramFeedSlide[] = [];
  const hero = sections.find((s) => s.type === "hero");
  const heroUrl = resolveUrl(
    imageUrls,
    hero && hero.type === "hero" ? hero.imageIndex : 0,
  );

  slides.push({
    id: "cover",
    kind: "cover",
    imageUrl: heroUrl,
    title: productName,
    subtitle: brandName ? `${brandName}` : undefined,
  });

  const featureSections = sections.filter(
    (s) =>
      s.type === "image_text" ||
      s.type === "checklist" ||
      s.type === "highlight_box" ||
      s.type === "brand_story" ||
      s.type === "step_card" ||
      s.type === "stat_infographic",
  );

  let imgCursor = 1 % imageUrls.length;
  for (const section of featureSections) {
    if (slides.length >= 6) break;
    const text = pickText(section);
    if (!text) continue;
    let url = heroUrl;
    if (section.type === "image_text") {
      url = resolveUrl(imageUrls, section.imageIndex);
    } else if (section.type === "step_card" && section.steps[0]?.imageIndex != null) {
      url = resolveUrl(imageUrls, section.steps[0].imageIndex);
    } else {
      url = imageUrls[imgCursor] ?? heroUrl;
      imgCursor = (imgCursor + 1) % imageUrls.length;
    }
    slides.push({
      id: `feature-${slides.length}`,
      kind: "feature",
      imageUrl: url,
      title: text.title.slice(0, 32),
      subtitle: text.body?.slice(0, 72),
    });
  }

  const cta = sections.find((s) => s.type === "cta_price");
  const ctaText = cta ? pickText(cta) : null;
  slides.push({
    id: "cta",
    kind: "cta",
    imageUrl: imageUrls[Math.min(imageUrls.length - 1, 1)] ?? heroUrl,
    title: ctaText?.title ?? productName,
    subtitle: ctaText?.body ?? "스토어에서 만나보세요",
  });

  return slides.slice(0, 7);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${url.slice(0, 80)}`));
    img.src = url;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slide: InstagramFeedSlide,
) {
  const size = FEED_SIZE;
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  const grad = ctx.createLinearGradient(0, size * 0.25, 0, size);
  grad.addColorStop(0, "rgba(27,27,24,0.05)");
  grad.addColorStop(0.5, "rgba(27,27,24,0.45)");
  grad.addColorStop(1, "rgba(27,27,24,0.94)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "rgba(250,248,243,0.12)";
  ctx.font = "600 22px \"Noto Sans KR\", sans-serif";
  ctx.fillText("NEW", 72, 96);

  ctx.fillStyle = "#FAF8F3";
  ctx.font = "700 68px \"Noto Sans KR\", sans-serif";
  wrapText(ctx, slide.title, 72, size - 240, size - 144, 76);
  if (slide.subtitle) {
    ctx.fillStyle = "rgba(250,248,243,0.72)";
    ctx.font = "500 30px \"Noto Sans KR\", sans-serif";
    ctx.fillText(slide.subtitle, 72, size - 88);
  }
}

function drawFeature(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slide: InstagramFeedSlide,
) {
  const size = FEED_SIZE;
  ctx.fillStyle = "#1B1B18";
  ctx.fillRect(0, 0, size, size);

  const pad = 56;
  const photoH = size * 0.56;
  const scale = Math.max((size - pad * 2) / img.naturalWidth, photoH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, pad, pad, size - pad * 2, photoH, 16);
  ctx.clip();
  ctx.drawImage(img, pad + (size - pad * 2 - w) / 2, pad + (photoH - h) / 2, w, h);
  ctx.restore();

  ctx.strokeStyle = "rgba(250,248,243,0.15)";
  ctx.lineWidth = 2;
  roundRect(ctx, pad, pad, size - pad * 2, photoH, 16);
  ctx.stroke();

  ctx.fillStyle = "#FAF8F3";
  ctx.font = '700 52px "Noto Sans KR", sans-serif';
  wrapText(ctx, slide.title, pad, pad + photoH + 88, size - pad * 2, 60);
  if (slide.subtitle) {
    ctx.fillStyle = "rgba(250,248,243,0.68)";
    ctx.font = '400 28px "Noto Sans KR", sans-serif';
    wrapText(ctx, slide.subtitle, pad, pad + photoH + 168, size - pad * 2, 38);
  }
}

function drawCta(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slide: InstagramFeedSlide,
) {
  const size = FEED_SIZE;
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  ctx.fillStyle = "rgba(27,27,24,0.78)";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#FAF8F3";
  ctx.font = '700 76px "Noto Sans KR", sans-serif';
  ctx.textAlign = "center";
  wrapTextCentered(ctx, slide.title, size / 2, size / 2 - 60, size - 160, 84);
  if (slide.subtitle) {
    ctx.fillStyle = "rgba(250,248,243,0.78)";
    ctx.font = '500 32px "Noto Sans KR", sans-serif';
    ctx.fillText(slide.subtitle, size / 2, size / 2 + 72);
  }

  const btnW = 280;
  const btnH = 64;
  const btnX = size / 2 - btnW / 2;
  const btnY = size - 180;
  ctx.fillStyle = "#C1272D";
  roundRect(ctx, btnX, btnY, btnW, btnH, 32);
  ctx.fill();
  ctx.fillStyle = "#FAF8F3";
  ctx.font = '700 26px "Noto Sans KR", sans-serif';
  ctx.fillText("지금 확인하기", size / 2, btnY + 42);
  ctx.textAlign = "left";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = [...text];
  let line = "";
  let cy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

function wrapTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = [...text];
  let line = "";
  let cy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, centerX - ctx.measureText(line).width / 2, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, centerX - ctx.measureText(line).width / 2, cy);
}

/** 브라우저에서 1080×1080 PNG data URL 생성 */
export async function renderInstagramFeedPng(slide: InstagramFeedSlide): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = FEED_SIZE;
  canvas.height = FEED_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas를 사용할 수 없습니다.");

  const img = await loadImage(slide.imageUrl);
  if (slide.kind === "cover") drawCover(ctx, img, slide);
  else if (slide.kind === "cta") drawCta(ctx, img, slide);
  else drawFeature(ctx, img, slide);

  return canvas.toDataURL("image/png");
}

export const INSTAGRAM_FEED_SIZE = FEED_SIZE;
