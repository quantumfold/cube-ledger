import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Player, Role } from "@/lib/types";

export async function getCurrentAppUser(): Promise<Player | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();
  const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        return;
      }
    }
  });

  const { data } = await authClient.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select("id, google_id, display_name, email, profile_image_url, role")
    .ilike("email", email)
    .single();

  if (!userRow) return null;

  return {
    id: userRow.id,
    googleId: userRow.google_id ?? undefined,
    displayName: userRow.display_name,
    email: userRow.email,
    profileImageUrl: userRow.profile_image_url ?? undefined,
    role: userRow.role as Role
  };
}
