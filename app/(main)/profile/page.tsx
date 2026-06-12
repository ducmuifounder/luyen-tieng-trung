import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DailyGroup } from "@/components/profile/DailyGroup";

export const metadata = { title: "Hồ sơ học viên | Tiếng Trung Bùi Nga" };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase  = await createSupabaseServerClient();
  const studentId = session.studentId;

  // ── Lấy tên học viên (bảng students) ────────────────────────────────────────
  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("username, created_at")
    .eq("id", studentId)
    .maybeSingle();

  // Nếu bảng chưa tồn tại hoặc user không tìm thấy → về login
  if (studentErr || !student) {
    redirect("/login");
  }

  // ── Lấy tiến độ hàng ngày ────────────────────────────────────────────────────
  const { data: progress } = await supabase
    .from("daily_progress")
    .select("item_id, level, practice_date, highest_score, attempt_count")
    .eq("student_id", studentId)
    .order("practice_date", { ascending: false })
    .limit(200);

  // ── Lấy breakdown Cấp 2 ──────────────────────────────────────────────────────
  const { data: logs } = await supabase
    .from("practice_logs")
    .select("item_id, practice_date, score, score_breakdown")
    .eq("student_id", studentId)
    .eq("level", 2)
    .not("score_breakdown", "is", null);

  // Map breakdown → key: "itemId|date"
  const breakdownMap: Record<string, Array<{ text: string; score: number }>> = {};
  for (const log of logs ?? []) {
    const key = `${log.item_id}|${log.practice_date}`;
    const bd  = log.score_breakdown as Array<{ text: string; score: number }>;
    if (!breakdownMap[key]) breakdownMap[key] = bd;
  }

  // ── Nhóm theo ngày ────────────────────────────────────────────────────────────
  type GroupedItem = {
    item_id: string; level: number; highest_score: number;
    attempt_count: number; breakdown?: Array<{ text: string; score: number }>;
  };
  const grouped: Record<string, GroupedItem[]> = {};

  for (const row of progress ?? []) {
    const date = row.practice_date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push({
      item_id:       row.item_id,
      level:         row.level,
      highest_score: Number(row.highest_score),
      attempt_count: row.attempt_count,
      breakdown:     breakdownMap[`${row.item_id}|${date}`],
    });
  }

  const dates       = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const totalItems  = (progress ?? []).length;
  const passedItems = (progress ?? []).filter((p) => Number(p.highest_score) >= 65).length;

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-6">

      {/* ── Header hồ sơ ── */}
      <div className="rounded-2xl bg-gradient-to-br from-green-700 to-green-500 p-5 text-white shadow-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
            {student.username[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold">{student.username}</p>
            <p className="text-xs text-green-100">
              Học viên từ{" "}
              {new Date(student.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-xl bg-white/10 p-3">
          {[
            { label: "Đã luyện", value: totalItems },
            { label: "Đã đạt",   value: passedItems },
            { label: "Ngày học", value: dates.length },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-green-100">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Điều hướng ── */}
      <div className="flex gap-2">
        <Link
          href="/luyen-phat-am"
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-center text-sm font-bold text-white hover:bg-red-700"
        >
          ← Quay lại luyện tập
        </Link>
        <Link
          href="/api/auth/logout"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Đăng xuất
        </Link>
      </div>

      {/* ── Lịch sử ── */}
      <div className="space-y-6">
        <h2 className="font-bold text-gray-800">Lịch sử luyện tập</h2>

        {dates.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 py-12 text-center text-sm text-gray-400">
            <p className="text-3xl mb-2">📚</p>
            Chưa có lịch sử. Hãy bắt đầu luyện tập!
          </div>
        ) : (
          dates.map((date) => (
            <DailyGroup key={date} date={date} items={grouped[date]} />
          ))
        )}
      </div>
    </main>
  );
}
