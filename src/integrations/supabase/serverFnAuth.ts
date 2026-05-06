// Attaches the current Supabase access token as a Bearer Authorization header
// to all TanStack Start server-function requests (which hit /_serverFn/*).
// This is a client-only patch — safe no-op on the server.
import { supabase } from "./client";

let installed = false;

export function installServerFnAuth() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url && url.includes("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
          if (!headers.has("authorization")) {
            headers.set("authorization", `Bearer ${token}`);
          }
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      // fall through to original fetch
    }
    return originalFetch(input, init);
  };
}
