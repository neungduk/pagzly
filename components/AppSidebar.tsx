"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const NAV_ITEMS = [
  {
    href: "/create",
    label: "상세페이지 만들기",
    match: (path: string) =>
      path === "/create" ||
      path.startsWith("/create/detail") ||
      path.startsWith("/create/social") ||
      path.startsWith("/create/result") ||
      path.startsWith("/create/draft"),
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    href: "/create/history",
    label: "내 작업 내역",
    match: (path: string) => path.startsWith("/create/history"),
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
        />
      </svg>
    ),
  },
] as const;

/**
 * /create 영역 공통 사이드바 — 기본 아이콘만, hover 시 폭 확장 + 라벨 표시.
 */
export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside
      className="group/sidebar sticky top-0 z-40 flex h-screen w-14 shrink-0 flex-col border-r border-line bg-paper transition-[width] duration-300 ease-out hover:w-52 motion-reduce:transition-none"
    >
      <div className="flex h-14 items-center border-b border-line px-3">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink text-paper">
            <span className="font-mono text-xs font-bold">P</span>
          </span>
          <span
            className="truncate text-sm font-semibold text-ink opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100"
          >
            Pagzly
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-registration-red/10 text-registration-red"
                  : "text-ink/60 hover:bg-line/40 hover:text-ink"
              }`}
            >
              {item.icon}
              <span
                className="truncate opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100"
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-ink/60 transition-colors hover:bg-line/40 hover:text-ink"
        >
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          <span
            className="truncate opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100"
          >
            로그아웃
          </span>
        </button>
      </div>
    </aside>
  );
}
