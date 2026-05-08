import { AuthButton } from "@/components/AuthButton";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
        }
      }
    });
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(next && next.startsWith("/") ? next : "/");
  }

  return (
    <div className="login-page">
      <section className="login-panel panel panel-pad">
        <div className="brand" style={{ marginBottom: 18 }}>
          <span className="brand-mark">CL</span>
          <span>Cube Ledger</span>
        </div>
        <h1>Sign in to view Cube Ledger</h1>
        <p className="muted">Draft history, player stats, money results, and editing tools are private to the playgroup.</p>
        {error ? <p className="auth-error">{error}</p> : null}
        <AuthButton />
      </section>
    </div>
  );
}
