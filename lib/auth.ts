import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Player, Role } from "@/lib/types";

export async function getCurrentAppUser(request?: Request): Promise<Player | null> {
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
  const bearerToken = bearerTokenFromRequest(request);
  const bearerUser = data.user || !bearerToken ? null : await authClient.auth.getUser(bearerToken);
  const user = data.user ?? bearerUser?.data.user ?? null;
  const email = user?.email?.trim().toLowerCase();
  const googleId = googleProviderId(user?.user_metadata);
  if (!email && !googleId) return null;

  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return null;

  const selectFields = "id, google_id, display_name, email, profile_image_url, role, login_enabled, show_on_leaderboard";
  const { data: emailMatch } = email
    ? await supabase.from("users").select(selectFields).ilike("email", email).maybeSingle()
    : { data: null };
  const { data: googleMatch } = !emailMatch && googleId
    ? await supabase.from("users").select(selectFields).eq("google_id", googleId).maybeSingle()
    : { data: null };
  const userRow = emailMatch ?? googleMatch;

  if (!userRow || userRow.login_enabled === false) return null;

  return {
    id: userRow.id,
    googleId: userRow.google_id ?? undefined,
    displayName: userRow.display_name,
    email: userRow.email,
    profileImageUrl: userRow.profile_image_url ?? undefined,
    role: userRow.role as Role,
    loginEnabled: userRow.login_enabled ?? true,
    showOnLeaderboard: userRow.show_on_leaderboard ?? true
  };
}

function bearerTokenFromRequest(request: Request | undefined) {
  const header = request?.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function googleProviderId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "";
  const value = (metadata as { provider_id?: unknown; sub?: unknown }).provider_id ?? (metadata as { sub?: unknown }).sub;
  return typeof value === "string" ? value.trim() : "";
}
