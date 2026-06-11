import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UnitGrid } from "@/components/pronunciation/UnitGrid";
import { UserProgress } from "@/lib/types";

export const metadata = { title: "Luyện phát âm | Luyện Tiếng Trung" };

export default async function LuyenPhatAmPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: units, error } = await supabase
    .from("pronunciation_units")
    .select("*")
    .order("type")
    .order("display_order");

  if (error) throw new Error(error.message);

  let progressMap: Record<string, UserProgress> = {};

  if (user) {
    const { data: progressRows } = await supabase
      .from("user_progress")
      .select("unit_id, best_score, attempt_count, status")
      .eq("user_id", user.id);

    progressMap = Object.fromEntries(
      (progressRows ?? []).map((p) => [p.unit_id, p])
    );
  }

  const total = units?.length ?? 0;
  const passed = Object.values(progressMap).filter(
    (p) => p.status === "passed"
  ).length;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Luyện phát âm</h1>
        <p className="mt-1 text-sm text-gray-500">
          Làm chủ Thanh mẫu · Vận mẫu · Thanh điệu để nền tảng phát âm vững chắc.
        </p>
      </div>

      {user && (
        <div className="rounded-2xl bg-red-50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            <span className="text-red-700">Tiến độ tổng thể</span>
            <span className="text-red-600">
              {passed} / {total} âm đã đạt
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-red-100">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: total ? `${(passed / total) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      <UnitGrid units={units ?? []} progressMap={progressMap} />
    </main>
  );
}
