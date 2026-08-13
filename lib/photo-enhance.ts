import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import sharp from "sharp";

const CANVAS_SIZE = 1200;

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (!replicateClient) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
    }
    replicateClient = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }
  return replicateClient;
}

const BACKDROP_PROMPTS: Record<string, string> = {
  "화장품/뷰티":
    "minimalist skincare studio background, soft pastel marble surface, gentle natural window light, subtle water droplets, empty product photography backdrop, no text, no logo, no product",
  "식품/건강기능식품":
    "warm rustic wooden table background, soft natural light, fresh ingredients softly blurred in background, empty food photography backdrop, no text, no logo, no product",
  "전자제품":
    "clean minimal tech studio background, cool gray gradient, soft studio lighting, subtle geometric shapes, empty product photography backdrop, no text, no logo, no product",
  "의류/패션":
    "soft neutral fabric-textured studio background, warm editorial lighting, empty product photography backdrop, no text, no logo, no product",
  "생활용품":
    "bright airy home interior background, soft natural light, minimal styling, empty product photography backdrop, no text, no logo, no product",
  "반려동물":
    "warm cozy home background, soft natural light, playful pastel tones, empty product photography backdrop, no text, no logo, no product",
  "기타":
    "clean minimal product photography studio background, soft gradient, empty backdrop, no text, no logo, no product",
};

function extractFluxImageUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

// 카테고리+상품 정보 기반으로 Flux(flux-schnell)로 배경 후보 3장을 생성하고,
// Claude Vision이 그중 가장 상품 사진과 어울릴 배경을 골라 반환한다.
// 상품 1건당 한 번만 호출해서, 모든 사진에 같은 배경을 재사용한다.
export async function generateBackdrop(
  category: string,
  productName: string,
  brandName?: string | null,
): Promise<Buffer> {
  const replicate = getReplicateClient();
  const prompt = BACKDROP_PROMPTS[category] ?? BACKDROP_PROMPTS["기타"];

  const results = await Promise.allSettled(
    Array.from({ length: 3 }).map(() =>
      replicate.run("black-forest-labs/flux-schnell", {
        input: { prompt, aspect_ratio: "1:1", output_format: "png" },
      }),
    ),
  );

  const candidateUrls = results.flatMap((result) => {
    if (result.status !== "fulfilled") {
      console.warn("[generateBackdrop] flux-schnell 호출 실패", result.reason);
      return [];
    }

    const url = extractFluxImageUrl(result.value);
    if (!url) {
      console.warn("[generateBackdrop] flux-schnell 결과 URL 없음");
      return [];
    }

    return [url];
  });

  if (candidateUrls.length === 0) {
    throw new Error("배경 이미지 생성에 모두 실패했습니다.");
  }

  const bestIndex =
    candidateUrls.length === 1
      ? 0
      : await pickBestBackdrop(candidateUrls, productName, brandName ?? null);

  const chosenUrl = candidateUrls[bestIndex] ?? candidateUrls[0];
  const chosenResponse = await fetch(chosenUrl);
  if (!chosenResponse.ok) {
    throw new Error("선택된 배경 이미지를 불러오지 못했습니다.");
  }
  return Buffer.from(await chosenResponse.arrayBuffer());
}

async function pickBestBackdrop(
  urls: string[],
  productName: string,
  brandName: string | null,
): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // 키가 없으면 그냥 첫 번째 후보 사용 (배경 생성 자체는 계속 동작해야 하므로)
    return 0;
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const imageBlocks = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/png" as const,
            data: buffer.toString("base64"),
          },
        };
      }),
    );

    const content = imageBlocks.flatMap((block, index) => [
      { type: "text" as const, text: `배경 후보 ${index}:` },
      block,
    ]);

    const indexOptions = urls.map((_, i) => String(i)).join(", ");
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: [
            ...content,
            {
              type: "text",
              text: `"${productName}"${brandName ? ` (${brandName})` : ""} 상품 사진을 올려둘 배경으로, 위 ${urls.length}개(${indexOptions}) 중 가장 깔끔하고 상품이 돋보일 배경 하나를 고르세요. 숫자 하나만 답하세요.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const indexPattern = new RegExp(`[0-${urls.length - 1}]`);
    const match =
      textBlock && textBlock.type === "text" ? textBlock.text.match(indexPattern) : null;
    const parsed = match ? parseInt(match[0], 10) : 0;
    return Math.min(Math.max(parsed, 0), urls.length - 1);
  } catch (error) {
    console.warn("[pickBestBackdrop] 실패, 첫 번째 후보 사용", error);
    return 0;
  }
}

// 원본 상품 사진의 배경을 제거하고, 미리 생성/선택된 backdropBuffer 위에 합성한다.
// backdropBuffer는 generateBackdrop()으로 상품당 한 번만 만들어 여러 사진에 재사용.
export async function enhanceProductImage(
  sourceImageUrl: string,
  backdropBuffer: Buffer,
): Promise<Buffer> {
  const replicate = getReplicateClient();

  const output = await replicate.run("851-labs/background-remover", {
    input: { image: sourceImageUrl },
  });

  const cutoutUrl = Array.isArray(output) ? output[0] : output;
  if (!cutoutUrl || typeof cutoutUrl !== "string") {
    throw new Error("배경 제거 결과를 받지 못했습니다.");
  }

  const cutoutResponse = await fetch(cutoutUrl);
  if (!cutoutResponse.ok) {
    throw new Error("배경 제거된 이미지를 불러오지 못했습니다.");
  }
  const cutoutBuffer = Buffer.from(await cutoutResponse.arrayBuffer());

  const backdropResized = await sharp(backdropBuffer)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
    .png()
    .toBuffer();

  const shadowSvg = `
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0,0,0,0.18)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="${CANVAS_SIZE / 2}" cy="${CANVAS_SIZE * 0.83}" rx="${CANVAS_SIZE * 0.26}" ry="${CANVAS_SIZE * 0.045}" fill="url(#shadow)" />
    </svg>
  `;
  const shadowBuffer = await sharp(Buffer.from(shadowSvg)).png().toBuffer();

  const targetSize = Math.round(CANVAS_SIZE * 0.68);
  const cutoutResized = await sharp(cutoutBuffer)
    .resize(targetSize, targetSize, { fit: "inside", withoutEnlargement: false })
    .toBuffer();
  const cutoutMeta = await sharp(cutoutResized).metadata();
  const width = cutoutMeta.width ?? targetSize;
  const height = cutoutMeta.height ?? targetSize;
  const left = Math.round((CANVAS_SIZE - width) / 2);
  const top = Math.round((CANVAS_SIZE - height) / 2) - Math.round(CANVAS_SIZE * 0.02);

  const finalBuffer = await sharp(backdropResized)
    .composite([
      { input: shadowBuffer, left: 0, top: 0 },
      { input: cutoutResized, left, top },
    ])
    .png()
    .toBuffer();

  return finalBuffer;
}
