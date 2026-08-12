import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import PagzlyLogo from "@/components/PagzlyLogo";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-white text-gray-900">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#6366f1]/5 to-white" />

      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <PagzlyLogo className="h-8 w-auto" />
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-[#6366f1]">대시보드</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            환영합니다 {user.email}님
          </h1>
          <p className="mt-3 text-gray-500">
            Pagzly에서 상세페이지를 만들어 보세요.
          </p>
        </div>
      </main>
    </div>
  );
}
