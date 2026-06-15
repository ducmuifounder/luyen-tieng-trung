import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface VocabEntry {
  id:                 number;
  chinese_char:       string;
  pinyin:             string;
  pinyin_no_tone:     string;
  vietnamese_meaning: string | null;
  level:              string;
}

// GET /api/vocabulary?level=HSK1
// GET /api/vocabulary?level=HSK2
// GET /api/vocabulary?pinyin=bāo          ← tra cứu theo pinyin có dấu
// GET /api/vocabulary?pinyin_no_tone=bao  ← tra cứu theo pinyin không dấu
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const level          = searchParams.get("level");
  const pinyin         = searchParams.get("pinyin");
  const pinyinNoTone   = searchParams.get("pinyin_no_tone");

  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.from("vocabulary").select("*");

    if (level)        query = query.eq("level", level).order("id");
    else if (pinyin)  query = query.eq("pinyin", pinyin).limit(5);
    else if (pinyinNoTone) query = query.eq("pinyin_no_tone", pinyinNoTone).limit(5);
    else return NextResponse.json({ error: "Cần truyền level, pinyin hoặc pinyin_no_tone" }, { status: 400 });

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
