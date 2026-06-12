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

  // Lấy tên học viên
  const { data: student } = await supabase
    .from("students")
    .select("username, created_at")
    .eq("id", studentId)
    .single();

  // Lấy toàn bộ tiến độ hàng ngày
  const { data: progress } = await supabase
    .from("daily_progress")
    .select("item_id, level, practice_date, highest_score, attempt_count")
    .eq("student_id", studentId)
    .order("practice_date", { ascending: false });

  // Lấy breakdown Cấp 2 từ practice_logs (lần có điểm cao nhất)
  const { data: logs } = await supabase
    .from("practice_logs")
    .select("item_id, practice_date, score, score_breakdown")
    .eq("student_id", studentId)
    .eq("level", 2)
    .not("score_breakdown", "is", null);

  // Map breakdown: key = "itemId|date" → breakdown của lần điểm cao nhất
  const breakdownMap: Record<string, Array<{ text: string; score: number }>> = {};
  for (const log of logs ?? []) {
    const key     = `${log.item_id}|${log.practice_date}`;
    const existing = breakdownMap[key];
    if (!existing || log.score > (existing as unknown as { _score: number })._score) {
      const bd = log.score_breakdown as Array<{ text: string; score: number }>;
      breakdownMap[key] = bd;
    }
  }

  // Nhóm theo ngày
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

  const dates     = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const totalItems = (progress ?? []).length;
  const passedItems = (progress ?? []).filter((p) => Number(p.highest_score) >= 65).length;

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-6">
      {/* Header hồ sơ */}
      <div className="rounded-2xl bg-gradient-to-br from-red-500 to-red-700 p-5 text-white shadow-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
            {student?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-lg font-bold">{student?.username}</p>
            <p className="text-xs text-red-100">
              Học viên từ{" "}
              {new Date(student?.created_at ?? "").toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-white/10 p-3">
          <div className="text-center">
            <p className="text-xl font-bold">{totalItems}</p>
            <p className="text-[10px] text-red-100">Đã luyện</p>
          </div>
          <div className="text-center border-x border-white/20">
            <p className="text-xl font-bold">{passedItems}</p>
            <p className="text-[10px] text-red-100">Đã đạt</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{dates.length}</p>
            <p className="text-[10px] text-red-100">Ngày học</p>
          </div>
        </div>
      </div>

      {/* Nút điều hướng */}
      <div className="flex gap-2">
        <Link
          href="/luyen-phat-am"
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-red-700"
        >
          ← Quay lại luyện tập
        </Link>
        <form action="/api/auth" method="POST">
          <button
            formMethod="DELETE"
            onClick={async (e) => {
              e.preventDefault();
              await fetch("/api/auth", { method: "DELETE" });
              window.location.href = "/login";
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Đăng xuất
          </button>
        </form>
      </div>

      {/* Lịch sử luyện tập */}
      <div className="space-y-6">
        <h2 className="font-bold text-gray-800">Lịch sử luyện tập</h2>

        {dates.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 py-10 text-center text-sm text-gray-400">
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
