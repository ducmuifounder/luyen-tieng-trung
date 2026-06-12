import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { PracticeClient } from "./PracticeClient";

interface Props {
  params: Promise<{ unitId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { unitId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pronunciation_units")
    .select("name")
    .eq("id", unitId)
    .single();
  return { title: data ? `Luyện "${data.name}" | Tiếng Trung Bùi Nga` : "Luyện phát âm" };
}

export default async function UnitDetailPage({ params }: Props) {
  const { unitId } = await params;
  const supabase   = await createSupabaseServerClient();

  // Thông tin âm
  const { data: unit, error } = await supabase
    .from("pronunciation_units")
    .select("*")
    .eq("id", unitId)
    .single();

  if (error || !unit) notFound();

  // Session học viên
  const session = await getSession();
  let attemptCount  = 0;
  let highestScore  = 0;

  if (session) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: dp } = await supabase
      .from("daily_progress")
      .select("attempt_count, highest_score")
      .eq("student_id", session.studentId)
      .eq("item_id", unit.name)
      .eq("practice_date", today)
      .maybeSingle();

    attemptCount = dp?.attempt_count ?? 0;
    highestScore = Number(dp?.highest_score ?? 0);
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/luyen-phat-am" className="hover:text-red-600 transition-colors">
          ← Danh sách bài học
        </Link>
      </nav>

      <PracticeClient
        unit={unit}
        studentId={session?.studentId ?? null}
        initialAttemptCount={attemptCount}
        initialHighestScore={highestScore}
      />
    </main>
  );
}
