import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("Supabase login auth check failed", { message: error.message });
  }

  if (data?.claims) {
    redirect("/");
  }

  return (
    <main className="min-h-dvh bg-ground text-text-primary">
      <div className="scanline-overlay" aria-hidden="true" />
      <section className="mx-auto flex min-h-dvh w-full max-w-[480px] items-center px-5 py-6 sm:px-6">
        <div className="w-full rounded-[8px] border border-cyan-divider bg-surface px-5 py-6 shadow-none">
          <p className="font-orbitron text-[11px] font-bold uppercase tracking-[4px] text-cyan">
            AUTH://gate
          </p>
          <h1 className="mt-3 font-orbitron text-2xl font-bold uppercase text-text-primary">
            Runner Access
          </h1>
          <p className="mt-3 font-rajdhani text-base font-semibold text-text-dim">
            Enter your operator credentials to resume the daily shell.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
