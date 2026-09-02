import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import AccountStatusBadge from "@/components/AccountStatusBadge";
import { createClient } from "@/lib/supabase/server";

export default async function CreateLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const meta = user.user_metadata;

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 flex shrink-0 justify-end border-b border-line bg-paper/95 px-3 py-2 backdrop-blur-md sm:px-4"
          data-testid="create-app-header"
        >
          <AccountStatusBadge
            user={{
              email: user.email,
              user_metadata: {
                avatar_url: typeof meta?.avatar_url === "string" ? meta.avatar_url : undefined,
                full_name: typeof meta?.full_name === "string" ? meta.full_name : undefined,
                name: typeof meta?.name === "string" ? meta.name : undefined,
              },
            }}
          />
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
