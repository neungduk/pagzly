import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { createClient } from "@/lib/supabase/server";

export default async function CreateLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <AppSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
