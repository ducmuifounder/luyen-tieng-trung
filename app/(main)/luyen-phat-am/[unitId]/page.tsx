import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PracticeClient } from "./PracticeClient";
import { UserProgress } from "@/lib/types";

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
  return { title: data ? `Luyện "${data.name}" | Luyện Tiếng Trung` : "Luyện phát âm" };
}

export default async function UnitDetailPage({ params }: Props) {
  const { unitId } = await params;
  const supabase = await createSupabaseServerClient();

  // Lấy thông tin âm
  const { data: unit, error } = await supabase
    .from("pronunciation_units")
    .select("*")
    .eq("id", unitId)
    .single();

  if (error || !unit) notFound();

  // Lấy user và tiến trình
  const { data: { user } } = await supabase.auth.getUser();

  let progress: UserProgress | null = null;
  if (user) {
    const { data } = await supabase
      .from("user_progress")
      .select("unit_id, best_score, attempt_count, status")
      .eq("user_id", user.id)
      .eq("unit_id", unitId)
      .maybeSingle();
    progress = data;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/luyen-phat-am" className="hover:text-red-600 transition-colors">
          ← Danh sách bài học
        </Link>
      </nav>

      <PracticeClient
        unit={unit}
        initialProgress={progress}
        userId={user?.id ?? null}
      />
    </main>
  );
}
