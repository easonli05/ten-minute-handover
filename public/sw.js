// Cache only what is safe to cache: the true static shell (icons, manifest,
// the offline fallback, Next's content-hashed build assets). Every page that
// can show class data — "/", "/login", future routes — is server-rendered
// with live data on every request, so it is always fetched from the network,
// never served from cache. The alternative (cache-first with a background
// refresh) was the bug this replaced: it could show yesterday's "open with"
// on a stale connection, and the background refresh updated the cache but
// not whatever was already on screen. See docs/decisions.md.
//
// Bumping SHELL_CACHE's version below purges any previously cached
// data-bearing responses from earlier versions of this file — the
// `activate` handler deletes every cache that isn't the current name.
const SHELL_CACHE = "tmh-shell-v3";
const OFFLINE_URL = "/offline.html";
const SHELL_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL_URLS.map((url) =>
          // redirect: "manual" instead of cache.addAll's default
          // follow-and-store-the-final-response behavior: if one of these
          // ever ends up behind auth (as offline.html briefly did — see
          // docs/decisions.md), a redirect surfaces as a thrown error and
          // fails the install loudly, instead of silently precaching the
          // login page under the shell URL's cache key.
          fetch(url, { redirect: "manual" }).then((response) => {
            if (response.type === "opaqueredirect" || !response.ok) {
              throw new Error(`Shell asset ${url} did not return 200 (${response.status || response.type})`);
            }
            return cache.put(url, response);
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Next.js App Router client-side navigation (a <Link> tap, router.push, or
// its own background prefetching) doesn't do a full-page navigation — it
// fetches the target page as an RSC payload instead, carrying the exact
// same class data a full reload would. That fetch's request.mode is
// "cors"/"same-origin", never "navigate", so the branch below alone always
// missed it: it fell through to the generic cache-first handler and got
// treated like a static asset, which is how a soft-navigated page could
// show stale data even though a full reload of the same URL was always
// correctly network-only. Next marks every one of these fetches with one
// of these headers (see node_modules/next/dist/client/components/
// app-router-headers.js) — checking for them, rather than trying to
// enumerate every page route here, is what makes this hold for routes
// added later too.
const NEXT_DATA_REQUEST_HEADERS = ["rsc", "next-router-state-tree", "next-router-prefetch", "next-url"];

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Page navigations always carry (or need) live data. Network-only, with
  // an explicit offline page instead of a stale cached copy when it fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // API calls are always network-only too — let them fail normally so the
  // app's own error handling (not the service worker) deals with it.
  if (url.pathname.startsWith("/api/")) return;

  // Client-side navigation/prefetch fetches for page data — see above.
  // Also network-only, same reasoning as a full navigation: these can
  // carry class data, so they must never be served from cache.
  if (NEXT_DATA_REQUEST_HEADERS.some((h) => request.headers.has(h))) return;

  // Everything else is allowlisted, not denylisted: only Next's
  // content-hashed static build output and the explicit shell files above
  // are safe to cache-first (they either never change post-deploy or are
  // harmless to show one version stale for a moment). Anything not
  // recognized falls through to the network uncached rather than being
  // assumed safe — the previous version of this file assumed "not a
  // navigation and not /api/" meant "safe to cache," which is exactly the
  // assumption the RSC-fetch case above proved wrong.
  const isKnownStaticAsset =
    url.pathname.startsWith("/_next/static/") || SHELL_URLS.includes(url.pathname);
  if (!isKnownStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});
