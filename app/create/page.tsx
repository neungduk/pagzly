import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CreateChooserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-12">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
          Create
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">무엇을 만드시겠어요?</h1>
        <p className="mt-2 text-sm text-ink/60">
          필요한 결과물에 맞는 경로를 선택하세요.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/create/detail"
          className="group flex flex-col rounded-2xl border border-line bg-paper p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-registration-red">
            Detail page
          </p>
          <h2 className="mt-2 text-xl font-bold text-ink">상세페이지</h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/65">
            쿠팡·스마트스토어용 풀 상세페이지. 사진 7~10장, 짧은/긴 구성 선택, 레퍼런스·리뷰
            분석까지 포함합니다.
          </p>
          <span className="mt-6 text-sm font-semibold text-registration-red group-hover:underline">
            상세페이지 만들기 →
          </span>
        </Link>

        <Link
          href="/create/social"
          className="group flex flex-col rounded-2xl border border-line bg-paper p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-blue">
            Social mini
          </p>
          <h2 className="mt-2 text-xl font-bold text-ink">인스타 피드 · 블로그/티스토리</h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/65">
            상세페이지 없이 SNS·블로그용 콘텐츠만. 사진 5장부터, 완성 1건 60토큰.
            티스토리 HTML·텍스트 복사로 바로 붙여넣기.
          </p>
          <span className="mt-6 text-sm font-semibold text-slate-blue group-hover:underline">
            미니 생성 시작 →
          </span>
        </Link>
      </div>
    </div>
  );
}
