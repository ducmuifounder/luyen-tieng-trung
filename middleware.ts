import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const SECRET     = process.env.SESSION_SECRET ?? "dev-secret-ltc-2026";
const COOKIE_NAME = "ltc_sid";

function verifySession(value: string): string | null {
  const sep = value.lastIndexOf(":");
  if (sep === -1) return null;
  const id  = value.slice(0, sep);
  const sig = value.slice(sep + 1);
  const expected = createHmac("sha256", SECRET).update(id).digest("hex");
  return sig === expected ? id : null;
}

// Các path không cần đăng nhập
const PUBLIC = ["/login", "/api/auth", "/api/score-pronunciation"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  const raw       = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const studentId = raw ? verifySession(raw) : null;

  // Chưa đăng nhập → redirect về login
  if (!isPublic && !studentId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Đã đăng nhập mà vào /login → redirect vào app
  if (pathname === "/login" && studentId) {
    return NextResponse.redirect(new URL("/luyen-phat-am", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
