import { NextResponse } from "next/server";
import { TOKEN_COST_CANVAS_AI_IMAGE } from "@/lib/cost/saas-pricing-config";
import { generateCanvasAiImage } from "@/lib/canvas-ai-image";
import { getCategoryTheme } from "@/lib/category-theme";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { uploadPngBuffer } from "@/lib/upload-png";
import { productImageProtectedUntil } from "@/lib/product-image-protection";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN이 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      prompt?: string;
      refImageUrl?: string | null;
      category?: string;
      productName?: string;
      elementId?: string;
    };

    const prompt = body.prompt?.trim();
    if (!prompt || !body.category || !body.productName) {
      return NextResponse.json(
        { error: "prompt, category, productName이 필요합니다." },
        { status: 400 },
      );
    }

    const { data: creditRow } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const balance = creditRow?.balance ?? 0;
    if (balance < TOKEN_COST_CANVAS_AI_IMAGE) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          balance,
          required: TOKEN_COST_CANVAS_AI_IMAGE,
        },
        { status: 402 },
      );
    }

    const theme = getCategoryTheme(body.category);
    const { buffer, cost } = await generateCanvasAiImage({
      prompt,
      refImageUrl: body.refImageUrl ?? undefined,
      category: body.category,
      productName: body.productName,
      theme,
    });

    const stamp = Date.now();
    const elementPart = body.elementId ? body.elementId.replace(/[^a-zA-Z0-9_-]/g, "") : "el";
    const storagePath = `${user.id}/canvas-ai/${stamp}-${elementPart}.png`;
    const uploaded = await uploadPngBuffer(supabase, storagePath, buffer);
    if ("error" in uploaded) {
      return NextResponse.json({ error: uploaded.error }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("product_images").insert({
      user_id: user.id,
      storage_path: uploaded.path,
      image_url: uploaded.publicUrl,
      image_uploaded_at: new Date().toISOString(),
      protected_until: productImageProtectedUntil(),
    });
    if (insertError) {
      console.warn("[canvas-ai-image] product_images insert:", insertError.message);
    }

    const referenceId = `canvas-ai:${body.elementId ?? stamp}`;
    const serviceClient = createServiceRoleClient();
    const { error: deductError } = await serviceClient.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: TOKEN_COST_CANVAS_AI_IMAGE,
      p_reason: "canvas_ai_image",
      p_reference_id: referenceId,
    });
    if (deductError) {
      console.error("[canvas-ai-image] deduct_credits failed:", deductError);
    }

    return NextResponse.json({
      resultUrl: uploaded.publicUrl,
      storagePath: uploaded.path,
      cost,
      tokensDeducted: TOKEN_COST_CANVAS_AI_IMAGE,
    });
  } catch (error) {
    console.error("[canvas-ai-image]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI 이미지 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
