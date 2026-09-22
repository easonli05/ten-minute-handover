import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const passcode = formData.get("passcode");

  if (typeof passcode !== "string" || passcode !== process.env.APP_PASSCODE) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, passcode, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  const from = formData.get("from");
  const redirectTo = typeof from === "string" && from.startsWith("/") ? from : "/";
  return NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 });
}
