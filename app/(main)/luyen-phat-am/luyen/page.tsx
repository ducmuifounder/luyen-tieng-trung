import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VALID_FINALS_FOR_INITIAL, buildPinyin } from "@/lib/pinyin-data";
import { PracticeClient } from "./PracticeClient";

interface Props {
  searchParams: Promise<{ initial?: string; final?: string; tone?: string }>;
}

export default async function PracticePage({ searchParams }: Props) {
  const params   = await searchParams;
  const initial  = params.initial ?? "";
  const final    = params.final   ?? "";
  const toneNum  = parseInt(params.tone ?? "0", 10);

  if (
    !initial || !final ||
    ![1, 2, 3, 4].includes(toneNum) ||
    !VALID_FINALS_FOR_INITIAL[initial]?.includes(final)
  ) {
    redirect("/luyen-phat-am");
  }

  const session   = await getSession();
  const studentId = session?.studentId ?? null;
  const pinyin    = buildPinyin(initial, final, toneNum);
  const itemId    = `${initial}-${final}-${toneNum}`;

  let attemptCount    = 0;
  let highestScore    = 0;
  let vietnameseMeaning: string | null = null;

  const supabase = await createSupabaseServerClient();

  // Tra nghĩa tiếng Việt từ bảng vocabulary (ưu tiên từ đơn âm tiết)
  const { data: vocabRows } = await supabase
    .from("vocabulary")
    .select("vietnamese_meaning, chinese_char")
    .eq("pinyin", pinyin)
    .limit(3);

  if (vocabRows && vocabRows.length > 0) {
    // Ưu tiên từ đơn ký tự (1 chữ Hán)
    const single = vocabRows.find(r => [...r.chinese_char].length === 1);
    vietnameseMeaning = (single ?? vocabRows[0]).vietnamese_meaning ?? null;
  }

  if (studentId) {
    const today    = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_progress")
      .select("attempt_count, highest_score")
      .eq("student_id", studentId)
      .eq("item_id", itemId)
      .eq("practice_date", today)
      .maybeSingle();

    if (data) {
      attemptCount = data.attempt_count;
      highestScore = data.highest_score;
    }
  }

  return (
    <PracticeClient
      initial={initial}
      final={final}
      toneNum={toneNum}
      pinyin={pinyin}
      itemId={itemId}
      studentId={studentId}
      initialAttemptCount={attemptCount}
      initialHighestScore={highestScore}
      vietnameseMeaning={vietnameseMeaning}
    />
  );
}
