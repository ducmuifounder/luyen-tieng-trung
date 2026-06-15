import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/profile/clear-history
// Xóa TOÀN BỘ lịch sử luyện tập của CHÍNH user đang đăng nhập.
// KHÔNG xóa tài khoản (bảng students được giữ nguyên).
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const supabase  = await createSupabaseServerClient();
    const studentId = session.studentId;

    // Chỉ xóa các bản ghi gắn với student_id của user này
    const [logsRes, progRes] = await Promise.all([
      supabase.from("practice_logs").delete().eq("student_id", studentId),
      supabase.from("daily_progress").delete().eq("student_id", studentId),
    ]);

    if (logsRes.error || progRes.error) {
      const msg = logsRes.error?.message ?? progRes.error?.message ?? "Lỗi không xác định";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
