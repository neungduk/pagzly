import Link from "next/link";
import PagzlyLogo from "@/components/PagzlyLogo";

/** 425차 — 없는 주소 안내(기본 Next 404 대신). 로그인 상태와 무관하게 홈으로 돌아가는 길만 준다. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <PagzlyLogo />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">찾을 수 없는 페이지입니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요. 아래 버튼으로 처음 화면으로 돌아가 주세요.
        </p>
      </div>
      <Link href="/" className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-6 text-sm font-semibold text-white">
        처음으로 돌아가기
      </Link>
    </main>
  );
}
