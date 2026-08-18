import { redirect } from "next/navigation";
import { createClient } from "./server";

// Page-level re-check on top of proxy.ts: a misconfigured matcher would bypass
// the proxy silently (stack-research §2 "belt and braces").
export async function requireUserId(pageLabel: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error(`Supabase ${pageLabel} auth check failed`, {
      message: error.message,
    });
    redirect("/login");
  }

  const userId = data?.claims?.sub;

  if (!userId) {
    console.error(`Supabase ${pageLabel} auth check failed`, {
      message: "Missing auth subject.",
    });
    redirect("/login");
  }

  return userId;
}
