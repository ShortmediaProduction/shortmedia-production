"use client";

/** Kleiner Fetch-Helfer für die Client-Komponenten. */
export async function api<T>(pfad: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(pfad, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Nicht angemeldet");
  }
  const data = (await res.json().catch(() => ({}))) as T & { fehler?: string };
  if (!res.ok) throw new Error(data.fehler ?? `Fehler ${res.status}`);
  return data;
}

export function relativeZeit(iso: string | null | undefined): string {
  if (!iso) return "noch nie";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const t = Math.round(h / 24);
  return t === 1 ? "gestern" : `vor ${t} Tagen`;
}
