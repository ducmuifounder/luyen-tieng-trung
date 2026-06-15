import { createHmac } from "crypto";
import { cookies } from "next/headers";

const SECRET      = process.env.SESSION_SECRET ?? "dev-secret-ltc-2026";
export const COOKIE_NAME = "ltc_sid";
const MAX_AGE     = 60 * 60 * 24 * 30; // 30 ngày

// ── Ký / xác thực giá trị cookie ─────────────────────────────────────────────
function sign(studentId: string): string {
  const sig = createHmac("sha256", SECRET).update(studentId).digest("hex");
  return `${studentId}:${sig}`;
}

function unsign(value: string): string | null {
  const sep = value.lastIndexOf(":");
  if (sep === -1) return null;
  const id  = value.slice(0, sep);
  const sig = value.slice(sep + 1);
  const expected = createHmac("sha256", SECRET).update(id).digest("hex");
  return sig === expected ? id : null;
}

// ── Đọc session từ cookie (dùng trong Server Component / Route Handler) ───────
export async function getSession(): Promise<{ studentId: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const studentId = unsign(raw);
  return studentId ? { studentId } : null;
}

// ── Tạo giá trị cookie để set trong Route Handler ────────────────────────────
export function buildSessionValue(studentId: string): string {
  return sign(studentId);
}

// ── Xác thực token (dùng cho /api/auth/resume) → trả studentId hoặc null ──────
export function verifySessionValue(value: string): string | null {
  return unsign(value);
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge:   MAX_AGE,
  path:     "/",
};
