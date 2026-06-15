import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DailyGroup } from "@/components/profile/DailyGroup";
import { ClearHistoryButton } from "@/components/profile/ClearHistoryButton";
import { LogoutButton } from "@/components/profile/LogoutButton";

export const metadata = { title: "Hồ sơ học viên | Tiếng Trung Bùi Nga" };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase  = await createSupabaseServerClient();
  const studentId = session.studentId;

  // Chỉ lấy dữ liệu trong 3 ngày gần nhất (hôm nay + 2 ngày trước)
  const since = new Date();
  since.setDate(since.getDate() - 2);
  const sinceDate = since.toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("username, created_at")
    .eq("id", studentId)
    .maybeSingle();

  if (studentErr || !student) redirect("/login");

  const { data: progress } = await supabase
    .from("daily_progress")
    .select("item_id, level, practice_date, highest_score, attempt_count")
    .eq("student_id", studentId)
    .gte("practice_date", sinceDate)
    .order("practice_date", { ascending: false })
    .limit(200);

  const { data: logs } = await supabase
    .from("practice_logs")
    .select("item_id, practice_date, score, score_breakdown")
    .eq("student_id", studentId)
    .eq("level", 2)
    .gte("practice_date", sinceDate)
    .not("score_breakdown", "is", null);

  const breakdownMap: Record<string, Array<{ text: string; score: number }>> = {};
  for (const log of logs ?? []) {
    const key = `${log.item_id}|${log.practice_date}`;
    const bd  = log.score_breakdown as Array<{ text: string; score: number }>;
    if (!breakdownMap[key]) breakdownMap[key] = bd;
  }

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
  const joinDate    = new Date(student.created_at).toLocaleDateString("vi-VN");

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">

      {/* ── Nút quay lại (to, dễ bấm) ── */}
      <Link
        href="/luyen-phat-am"
        className="flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
      >
        ← Quay lại luyện tập
      </Link>

      {/* ── Thẻ học viên ── */}
      <div className="rounded-2xl bg-gradient-to-br from-green-700 to-green-500 p-5 text-white shadow-md">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
            {student.username[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold leading-tight">{student.username}</p>
            <p className="text-xs text-green-100 mt-0.5">Học viên từ {joinDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/10 p-3">
          {[
            { label: "Đã luyện", value: totalItems },
            { label: "Đã đạt",   value: passedItems },
            { label: "Ngày học", value: dates.length },
          ].map((s) => (
            <div key={s.label} className="text-center py-1">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[11px] text-green-100 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lịch sử luyện tập ── */}
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold text-gray-800 text-base">Lịch sử luyện tập</h2>
          {dates.length > 0 && <ClearHistoryButton />}
        </div>

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

      {/* ── Đăng xuất (cuối trang, tách biệt hẳn) ── */}
      <div className="pt-4 border-t border-gray-100">
        <LogoutButton />
      </div>

    </main>
  );
}
