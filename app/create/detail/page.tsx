import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import CreateProductForm from "@/components/CreateProductForm";

export default async function CreateDetailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    <Suspense fallback={<div className="p-10 text-sm text-ink/50">불러오는 중…</div>}>
      <CreateProductForm userId={user.id} />
    </Suspense>
  );
}
