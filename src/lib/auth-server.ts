import { cookies } from "next/headers";
import { AUTH_COOKIE } from "./auth";

// Server Actions are reachable by direct POST even though the page that
// renders their form is behind src/proxy.ts, so each action re-checks the
// passcode itself rather than relying solely on the proxy having run first.
export async function assertAuthenticated() {
  const cookieStore = await cookies();
  const passcode = cookieStore.get(AUTH_COOKIE)?.value;

  if (!process.env.APP_PASSCODE || passcode !== process.env.APP_PASSCODE) {
    throw new Error("Not authenticated");
  }
}
