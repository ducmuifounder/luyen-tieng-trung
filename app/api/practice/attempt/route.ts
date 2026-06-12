import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 3;

export interface AttemptPayload {
  itemId:         string;
  level:          1 | 2;
  score:          number;
  scoreBreakdown?: Array<{ text: string; score: number }>;
}

export async function POST(req: NextRequest) {
  try {
    // Xác thực session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { itemId, level, score, scoreBreakdown }: AttemptPayload =
      await req.json();

    if (!itemId || score === undefined) {
      return NextResponse.json({ error: "Thiếu dữ liệu." }, { status: 400 });
    }

    const supabase   = await createSupabaseServerClient();
    const today      = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const studentId  = session.studentId;

    // Lấy tiến độ hôm nay (nếu có)
    const { data: existing } = await supabase
      .from("daily_progress")
      .select("id, attempt_count, highest_score")
      .eq("student_id", studentId)
      .eq("item_id", itemId)
      .eq("practice_date", today)
      .maybeSingle();

    // Kiểm tra giới hạn 3 lần/ngày
    if (existing && existing.attempt_count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Đã đạt giới hạn 3 lần luyện hôm nay." },
        { status: 429 }
      );
    }

    const prevCount       = existing?.attempt_count ?? 0;
    const prevHighest     = existing?.highest_score ?? 0;
    const newCount        = prevCount + 1;
    const newHighest      = Math.max(prevHighest, score);

    // 1. Ghi raw log
    await supabase.from("practice_logs").insert({
      student_id:      studentId,
      item_id:         itemId,
      level,
      score,
      score_breakdown: scoreBreakdown ?? null,
      practice_date:   today,
    });

    // 2. Upsert daily_progress
    await supabase.from("daily_progress").upsert(
      {
        student_id:    studentId,
        item_id:       itemId,
        level,
        practice_date: today,
        attempt_count: newCount,
        highest_score: newHighest,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: "student_id,item_id,practice_date" }
    );

    return NextResponse.json({
      attemptCount: newCount,
      highestScore: newHighest,
      attemptsLeft: MAX_ATTEMPTS - newCount,
    });

  } catch (err) {
    console.error("[practice/attempt]", err);
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}
