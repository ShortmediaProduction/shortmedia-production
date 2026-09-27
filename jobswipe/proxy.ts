import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Schützt alle Routen. Nur der Account aus ALLOWED_EMAIL kommt rein.
 * Ausnahmen: Login, Auth-Callback, Cron (eigenes Secret) und PWA-Dateien.
 */
const OFFEN = [/^\/login/, /^\/auth\//, /^\/api\/cron\//, /^\/manifest\.webmanifest$/, /^\/icon/, /^\/apple-icon/];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (OFFEN.some((re) => re.test(pathname))) return NextResponse.next();
  if (process.env.DEMO_MODE === "1" && process.env.NODE_ENV !== "production") return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const erlaubt = (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();

  let response = NextResponse.next({ request });
  let email: string | undefined;
  if (url && key && erlaubt) {
    const sb = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    });
    const { data } = await sb.auth.getUser();
    email = data.user?.email?.toLowerCase();
  }

  if (email && email === erlaubt) return response;

  if (pathname.startsWith("/api/")) return NextResponse.json({ fehler: "Nicht angemeldet" }, { status: 401 });
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = email ? "?fehler=account" : "";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
