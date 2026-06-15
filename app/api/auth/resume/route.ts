import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/session";

// POST /api/auth/resume  { token }
// Khôi phục phiên đăng nhập từ token đã lưu ở localStorage (cho webview hay mất cookie).
// Token là chuỗi đã ký HMAC → không thể giả mạo nếu không có SESSION_SECRET.
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Thiếu token." }, { status: 400 });
    }

    const studentId = verifySessionValue(token);
    if (!studentId) {
      return NextResponse.json({ error: "Token không hợp lệ." }, { status: 401 });
    }

    // Đặt lại cookie phiên (httpOnly) cho các request server tiếp theo
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch {
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}
