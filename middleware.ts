import { NextRequest, NextResponse } from "next/server";

// Edge Runtime: dùng Web Crypto API thay vì Node.js crypto
const SECRET      = process.env.SESSION_SECRET ?? "dev-secret-ltc-2026";
const COOKIE_NAME = "ltc_sid";
const enc         = new TextEncoder();

async function getCryptoKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function verifySession(value: string): Promise<string | null> {
  const sep = value.lastIndexOf(":");
  if (sep === -1) return null;

  const id  = value.slice(0, sep);
  const sig = value.slice(sep + 1);

  const key      = await getCryptoKey();
  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(id));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return sig === expected ? id : null;
}

// Các path không cần đăng nhập
const PUBLIC = ["/login", "/api/auth", "/api/score-pronunciation"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic     = PUBLIC.some((p) => pathname.startsWith(p));

  const raw       = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const studentId = raw ? await verifySession(raw) : null;

  if (!isPublic && !studentId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/login" && studentId) {
    return NextResponse.redirect(new URL("/luyen-phat-am", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
