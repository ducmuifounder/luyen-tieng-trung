import { NextResponse } from "next/server";
import { COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/session";

export async function GET() {
  const res = NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_SITE_URL ?? "https://luyen-tieng-trung-chi.vercel.app")
  );
  res.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
