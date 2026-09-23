// Where /api/login sends the browser after a successful login — normally
// wherever the passcode-check redirect (src/proxy.ts) sent it from, via a
// `from` field on the login form. `from` is attacker-controllable input (an
// attacker can craft the login link itself, e.g. to phish a passcode), so
// it must never be able to send a real login somewhere off this app.
//
// A plain `from.startsWith("/")` check (the original implementation) looks
// safe but isn't: "//evil.example/x" and "/\evil.example/x" both start
// with "/", and both are protocol-relative URLs that a browser resolves to
// a *different host* — the second because the WHATWG URL spec normalizes
// backslashes to forward slashes for http(s) before parsing. Enumerating
// bypass patterns like these by hand is exactly the kind of denylist that
// misses the next one; instead, this resolves `from` against the app's own
// origin with the platform's own URL parser and only accepts the result if
// that parser says it's still the same origin — which is the actual
// property that matters, however the bypass is spelled.
export function safeRedirectPath(from: unknown, origin: string): string {
  if (typeof from !== "string" || from.length === 0) return "/";

  let resolved: URL;
  try {
    resolved = new URL(from, origin);
  } catch {
    return "/";
  }

  if (resolved.origin !== origin) return "/";
  return resolved.pathname + resolved.search + resolved.hash;
}
