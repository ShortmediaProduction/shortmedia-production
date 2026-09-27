import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/config";

/** Supabase-Client mit der Session des eingeloggten Nutzers (nur für Auth, nicht für Daten). */
export async function authClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // In Server Components nicht setzbar; der Proxy erneuert die Session.
        }
      },
    },
  });
}
