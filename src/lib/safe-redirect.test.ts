import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

const ORIGIN = "https://handover.example";

// Regression coverage for Codex's F7 finding (GitHub issue #1): the login
// route's `from` redirect target accepted a protocol-relative URL and sent
// the browser off-site after a successful login.
describe("safeRedirectPath", () => {
  it("passes through a plain same-origin path", () => {
    expect(safeRedirectPath("/class/abc123", ORIGIN)).toBe("/class/abc123");
  });

  it("keeps the query string and hash of a same-origin path", () => {
    expect(safeRedirectPath("/review?tab=notes#top", ORIGIN)).toBe("/review?tab=notes#top");
  });

  it("defaults to / for a missing or non-string from", () => {
    expect(safeRedirectPath(null, ORIGIN)).toBe("/");
    expect(safeRedirectPath(undefined, ORIGIN)).toBe("/");
    expect(safeRedirectPath("", ORIGIN)).toBe("/");
  });

  it("rejects Codex's exact F7 repro: a protocol-relative //host target", () => {
    expect(safeRedirectPath("//example.invalid/after-login", ORIGIN)).toBe("/");
  });

  it("rejects a backslash variant of a protocol-relative target", () => {
    expect(safeRedirectPath("/\\example.invalid/after-login", ORIGIN)).toBe("/");
    expect(safeRedirectPath("\\/example.invalid/after-login", ORIGIN)).toBe("/");
    expect(safeRedirectPath("\\\\example.invalid/after-login", ORIGIN)).toBe("/");
  });

  it("rejects an absolute URL to another origin, even with a leading slash in its path", () => {
    expect(safeRedirectPath("https://example.invalid/after-login", ORIGIN)).toBe("/");
    expect(safeRedirectPath("http://example.invalid/after-login", ORIGIN)).toBe("/");
  });

  it("rejects a non-http(s) scheme", () => {
    expect(safeRedirectPath("javascript:alert(1)", ORIGIN)).toBe("/");
  });

  it("rejects a bare host with no scheme (would resolve relative to our own origin as a path, which is fine, but confirm it never becomes an external origin)", () => {
    // "evil.example" with no leading slash resolves as a same-origin path
    // ("/evil.example"), which is safe — this just documents that behavior
    // rather than asserting it should be rejected.
    expect(safeRedirectPath("evil.example", ORIGIN).startsWith(ORIGIN)).toBe(false);
    expect(new URL(safeRedirectPath("evil.example", ORIGIN), ORIGIN).origin).toBe(ORIGIN);
  });

  it("rejects malformed input that fails to parse", () => {
    expect(safeRedirectPath("http://", ORIGIN)).toBe("/");
  });
});
