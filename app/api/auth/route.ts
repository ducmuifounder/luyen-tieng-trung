import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { buildSessionValue, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Thiếu tên học viên hoặc mật khẩu." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Kiểm tra tên học viên đã tồn tại chưa
    const { data: existing } = await supabase
      .from("students")
      .select("id, password_hash")
      .eq("username", username.trim())
      .maybeSingle();

    let studentId: string;

    if (!existing) {
      // ── ĐĂNG KÝ MỚI ────────────────────────────────────────────────────────
      const passwordHash = await hashPassword(password);
      const { data: newStudent, error } = await supabase
        .from("students")
        .insert({ username: username.trim(), password_hash: passwordHash })
        .select("id")
        .single();

      if (error || !newStudent) {
        return NextResponse.json(
          { error: "Không thể tạo tài khoản. Vui lòng thử lại." },
          { status: 500 }
        );
      }
      studentId = newStudent.id;
    } else {
      // ── ĐĂNG NHẬP ──────────────────────────────────────────────────────────
      const ok = await verifyPassword(password, existing.password_hash);
      if (!ok) {
        return NextResponse.json(
          { error: "Mật khẩu không đúng." },
          { status: 401 }
        );
      }
      studentId = existing.id;
    }

    // Set session cookie
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, buildSessionValue(studentId), COOKIE_OPTIONS);
    return res;

  } catch (err) {
    console.error("[api/auth]", err);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}

// Đăng xuất
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
