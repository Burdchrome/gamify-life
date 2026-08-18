"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Sign-in failed. Try again.";
      console.error("Supabase sign-in failed", { message });
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label
          className="font-orbitron text-[11px] font-bold uppercase tracking-[3px] text-cyan"
          htmlFor="email"
        >
          Email
        </label>
        <input
          autoComplete="email"
          className="min-h-12 rounded-[8px] border border-cyan-divider bg-ground px-4 font-rajdhani text-lg font-semibold text-text-primary outline-none transition focus:border-cyan"
          id="email"
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          className="font-orbitron text-[11px] font-bold uppercase tracking-[3px] text-cyan"
          htmlFor="password"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className="min-h-12 rounded-[8px] border border-cyan-divider bg-ground px-4 font-rajdhani text-lg font-semibold text-text-primary outline-none transition focus:border-cyan"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {errorMessage ? (
        <p
          className="font-rajdhani text-base font-semibold text-error"
          data-testid="login-error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        className="min-h-12 rounded-[8px] border border-cyan bg-cyan px-4 font-orbitron text-xs font-bold uppercase tracking-[3px] text-ground transition hover:bg-ground hover:text-cyan disabled:cursor-not-allowed disabled:border-cyan-divider disabled:bg-surface disabled:text-text-muted"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "CONNECTING" : "CONNECT"}
      </button>
    </form>
  );
}
