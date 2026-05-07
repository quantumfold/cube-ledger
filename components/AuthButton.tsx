"use client";

import { LogIn, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthButton() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.user);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signInWithGoogle() {
    const origin = window.location.origin;
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login";
  }

  if (isLoading) {
    return <button type="button" disabled>Checking login</button>;
  }

  if (user) {
    const label = user.user_metadata?.full_name ?? user.email ?? "Signed in";
    return (
      <div className="auth-cluster">
        <span className="auth-name">{label}</span>
        <button type="button" onClick={signOut}><LogOut size={16} /> Sign out</button>
      </div>
    );
  }

  return (
    <button type="button" className="primary" onClick={signInWithGoogle}>
      <LogIn size={16} /> Sign in with Google
    </button>
  );
}
