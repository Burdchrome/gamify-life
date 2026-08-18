import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocalDate } from "./components/local-date";

export default async function Home() {
  const supabase = await createClient();
  // Page-level re-check on top of proxy.ts: a misconfigured matcher would bypass the proxy silently (stack-research §2 "belt and braces")
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("Supabase home auth check failed", { message: error.message });
  }

  if (error || !data?.claims) {
    redirect("/login");
  }

  async function signOut() {
    "use server";

    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase sign-out failed", { error });
    }

    redirect("/login");
  }

  return (
    <main className="min-h-dvh bg-ground text-text-primary">
      <div className="scanline-overlay" aria-hidden="true" />
      <section className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-6 sm:px-6">
        <header className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-orbitron text-[11px] font-bold uppercase tracking-[4px] text-cyan">
                RUNNER://daily
              </p>
              <LocalDate />
            </div>
            <div className="shrink-0 text-right">
              <p className="font-orbitron text-xl font-bold leading-none text-yellow">
                --
              </p>
              <p className="mt-1 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-yellow/50">
                RANK
              </p>
              <form action={signOut} className="mt-3">
                <button
                  className="min-h-11 rounded-[8px] border border-cyan-divider px-3 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan transition hover:border-cyan disabled:text-text-muted"
                  type="submit"
                >
                  DISCONNECT
                </button>
              </form>
            </div>
          </div>
        </header>
        <div className="h-px bg-cyan-divider" />
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="font-rajdhani text-[13px] font-semibold uppercase tracking-[0.5px] text-text-muted">
            NO OPS LOADED - SYSTEM STANDBY
          </p>
        </div>
      </section>
    </main>
  );
}
