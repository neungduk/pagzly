import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBackdrop } from "@/lib/photo-enhance";

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

    const { category, productName, brandName } = (await request.json()) as {
      category?: string;
      productName?: string;
      brandName?: string | null;
    };

    if (!category || !productName) {
      return NextResponse.json(
        { error: "category, productName이 필요합니다." },
        { status: 400 },
      );
    }

    const backdropBuffer = await generateBackdrop(category, productName, brandName ?? null);
    const backdropDataUrl = `data:image/png;base64,${backdropBuffer.toString("base64")}`;

    return NextResponse.json({ backdropDataUrl });
  } catch (error) {
    console.error("[generate-backdrop]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "배경 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
