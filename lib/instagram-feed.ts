import type { DetailSection } from "@/lib/types/generate";

export type InstagramFeedSlide = {
  id: string;
  /** 배경 이미지 URL (상품 사진) */
  imageUrl: string;
  /** 큰 카피 */
  title: string;
  /** 보조 한 줄 */
  subtitle?: string;
  /** cover | feature | cta */
  kind: "cover" | "feature" | "cta";
};

const FEED_SIZE = 1080;

function pickText(section: DetailSection): { title: string; body?: string } | null {
  if (section.type === "hero") {
    return { title: section.headline, body: section.subheadline };
  }
  if (section.type === "image_text") {
    return { title: section.heading, body: section.body };
  }
  if (section.type === "checklist") {
    return { title: section.heading, body: section.items.slice(0, 3).join(" · ") };
  }
  if (section.type === "highlight_box") {
    const card = section.cards[0];
    return card ? { title: card.title, body: card.body } : { title: section.heading };
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

/** 상세페이지 섹션·사진으로 인스타 1:1 피드 슬라이드 기획 (최대 7장). */
export function buildInstagramFeedSlides(opts: {
  productName: string;
  brandName?: string | null;
  sections: DetailSection[];
  imageUrls: string[];
}): InstagramFeedSlide[] {
  const { productName, brandName, sections, imageUrls } = opts;
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
    subtitle: brandName ? `${brandName} · Pagzly` : "Pagzly Detail",
  });

  const featureSections = sections.filter(
    (s) =>
      s.type === "image_text" ||
      s.type === "checklist" ||
      s.type === "highlight_box",
  );

  let imgCursor = 1 % imageUrls.length;
  for (const section of featureSections) {
    if (slides.length >= 6) break;
    const text = pickText(section);
    if (!text) continue;
    let url = heroUrl;
    if (section.type === "image_text") {
      url = resolveUrl(imageUrls, section.imageIndex);
    } else {
      url = imageUrls[imgCursor] ?? heroUrl;
      imgCursor = (imgCursor + 1) % imageUrls.length;
    }
    slides.push({
      id: `feature-${slides.length}`,
      kind: "feature",
      imageUrl: url,
      title: text.title.slice(0, 28),
      subtitle: text.body?.slice(0, 60),
    });
  }

  const cta = sections.find((s) => s.type === "cta_price");
  const ctaText = cta ? pickText(cta) : null;
  slides.push({
    id: "cta",
    kind: "cta",
    imageUrl: imageUrls[Math.min(imageUrls.length - 1, 2)] ?? heroUrl,
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
  // cover crop
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  const grad = ctx.createLinearGradient(0, size * 0.35, 0, size);
  grad.addColorStop(0, "rgba(27,27,24,0)");
  grad.addColorStop(0.45, "rgba(27,27,24,0.55)");
  grad.addColorStop(1, "rgba(27,27,24,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#FAF8F3";
  ctx.font = "700 64px 'Gmarket Sans', Pretendard, sans-serif";
  wrapText(ctx, slide.title, 72, size - 220, size - 144, 72);
  if (slide.subtitle) {
    ctx.fillStyle = "rgba(250,248,243,0.7)";
    ctx.font = "500 28px Pretendard, sans-serif";
    ctx.fillText(slide.subtitle, 72, size - 100);
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

  const pad = 48;
  const photoH = size * 0.58;
  const scale = Math.max((size - pad * 2) / img.naturalWidth, photoH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad, pad, size - pad * 2, photoH);
  ctx.clip();
  ctx.drawImage(img, pad + (size - pad * 2 - w) / 2, pad + (photoH - h) / 2, w, h);
  ctx.restore();

  ctx.fillStyle = "#FAF8F3";
  ctx.font = "700 48px 'Gmarket Sans', Pretendard, sans-serif";
  wrapText(ctx, slide.title, pad, pad + photoH + 80, size - pad * 2, 56);
  if (slide.subtitle) {
    ctx.fillStyle = "rgba(250,248,243,0.65)";
    ctx.font = "400 26px Pretendard, sans-serif";
    wrapText(ctx, slide.subtitle, pad, pad + photoH + 160, size - pad * 2, 36);
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
  ctx.fillStyle = "rgba(27,27,24,0.72)";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#FAF8F3";
  ctx.font = "700 72px 'Gmarket Sans', Pretendard, sans-serif";
  wrapText(ctx, slide.title, 80, size / 2 - 40, size - 160, 80);
  if (slide.subtitle) {
    ctx.fillStyle = "rgba(250,248,243,0.75)";
    ctx.font = "500 30px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(slide.subtitle, size / 2, size / 2 + 80);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = "#C1272D";
  ctx.fillRect(size / 2 - 120, size - 160, 240, 56);
  ctx.fillStyle = "#FAF8F3";
  ctx.font = "700 24px Pretendard, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("지금 확인하기", size / 2, size - 124);
  ctx.textAlign = "left";
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
