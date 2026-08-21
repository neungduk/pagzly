import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type HistoryProduct = {
  id: string;
  product_name: string;
  category: string;
  image_urls: string[] | null;
  created_at: string;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function CreateHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("id, product_name, category, image_urls, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[create/history]", error);
  }

  const rows = (products ?? []) as HistoryProduct[];

  return (
    <div className="min-h-full bg-paper text-ink">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-line/40 to-paper" />

      <main className="mx-auto max-w-3xl px-6 py-10 pb-16">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-registration-red">
            History
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-ink sm:text-3xl">
            내 작업 내역
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            이전에 생성한 상세페이지를 다시 열어 확인할 수 있습니다.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
            <p className="text-sm text-ink/60">아직 저장된 작업이 없습니다.</p>
            <Link
              href="/create"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-ink/85"
            >
              상세페이지 만들기
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.map((item) => {
              const thumb = item.image_urls?.[0];
              return (
                <li key={item.id}>
                  <Link
                    href={`/create/result?id=${item.id}`}
                    className="flex gap-4 rounded-2xl border border-line bg-paper p-4 shadow-sm transition-colors hover:border-ink/25 hover:bg-line/10"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-line/30">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-ink/40">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{item.product_name}</p>
                      <p className="mt-1 text-sm text-ink/55">{item.category}</p>
                      <p className="mt-2 font-mono text-xs text-ink/40">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                    <span className="self-center text-sm font-medium text-registration-red">
                      보기 →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
