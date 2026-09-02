import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAutofillDraft, type AutofillDraftInput } from "@/lib/autofill-draft";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = (await request.json()) as AutofillDraftInput & {
      imageUrls?: string[];
    };
    const category = body.category?.trim();
    const productName = body.productName?.trim();
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.map((u) => String(u).trim()).filter(Boolean)
      : undefined;

    if (!category || !productName || productName.length < 2) {
      return NextResponse.json(
        { error: "category와 productName(2자 이상)이 필요합니다." },
        { status: 400 },
      );
    }

    const { draft, cost, visionCost, deepseekCost, visionImageCount } =
      await generateAutofillDraft({
        category,
        productName,
        brandName: body.brandName?.trim() || null,
        imageUrls,
      });

    return NextResponse.json({
      draft,
      cost,
      visionCost,
      deepseekCost,
      visionImageCount,
    });
  } catch (error) {
    console.error("[autofill-draft]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "자동입력 초안 생성 실패" },
      { status: 500 },
    );
  }
}
