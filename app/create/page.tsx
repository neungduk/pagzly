import { createClient } from "@/lib/supabase/server";
import CreateProductForm from "@/components/CreateProductForm";

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return <CreateProductForm userId={user.id} />;
}
