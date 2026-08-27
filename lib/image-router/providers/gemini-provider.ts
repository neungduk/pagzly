import {
  ProviderUnavailableError,
  type ImageProvider,
  type ProviderGenerateInput,
  type ProviderGenerateOutput,
} from "@/lib/image-router/providers/image-provider";
import {
  generateGemini3ProImage,
  isGeminiGoogleAvailable,
} from "@/lib/image-router/providers/gemini-google-client";

const GEMINI_MODEL = "gemini-3-pro-image";

/** Gemini 3 Pro Image — premium / budget-aware fallback */
export class GeminiProvider implements ImageProvider {
  readonly id = "gemini" as const;
  readonly model = GEMINI_MODEL;
  readonly backend = "direct" as const;

  isAvailable(): boolean {
    return isGeminiGoogleAvailable();
  }

  async generate(input: ProviderGenerateInput): Promise<ProviderGenerateOutput> {
    if (!this.isAvailable()) {
      throw new ProviderUnavailableError(
        "gemini",
        "GOOGLE_AI_API_KEY required for GeminiProvider",
      );
    }
    return generateGemini3ProImage(input);
  }
}

export function createGeminiProvider(): GeminiProvider {
  return new GeminiProvider();
}
