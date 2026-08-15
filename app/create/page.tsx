import { redirect } from "next/navigation";
import CreateProductForm from "@/components/CreateProductForm";
import { createClient } from "@/lib/supabase/server";

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <CreateProductForm userId={user.id} />;
}
