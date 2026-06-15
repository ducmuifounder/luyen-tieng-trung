import Link from "next/link";
import { redirect } from "next/navigation";
import {
  VALID_FINALS_FOR_INITIAL, displayFinalName,
  TONE_MARKS_DISPLAY, TONE_NAMES, buildPinyin,
} from "@/lib/pinyin-data";
import { getHanzi } from "@/lib/hanzi-map";

interface Props {
  searchParams: Promise<{ initial?: string; final?: string }>;
}

export default async function SelectTonePage({ searchParams }: Props) {
  const params  = await searchParams;
  const initial = params.initial ?? "";
  const final   = params.final   ?? "";

  if (!initial || !final || !VALID_FINALS_FOR_INITIAL[initial]?.includes(final)) {
    redirect("/luyen-phat-am");
  }

  const backUrl = `/luyen-phat-am/van-mau?initial=${encodeURIComponent(initial)}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={backUrl} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Bước 3 / 3</p>
          <h1 className="text-xl font-bold text-gray-800">
            <span className="text-emerald-600">{initial}</span>
            <span className="text-gray-300 mx-1">+</span>
            <span className="text-emerald-700">{displayFinalName(final)}</span>
            <span className="text-gray-300 mx-1">+</span>
            Chọn Thanh điệu
          </h1>
        </div>
      </div>

      {/* 5 thanh điệu (gồm thanh nhẹ) — chỉ những thanh có chữ Hán mới chấm được */}
      <div className="grid grid-cols-2 gap-3">
        {([1, 2, 3, 4, 0] as const).map((t) => {
          // Âm tiết không tồn tại trong tiếng Trung (vd "pǎ") → không có chữ Hán → khóa
          // Thanh nhẹ (0) chỉ hiện ở những âm có cách đọc nhẹ (吗, 呢, 了...)
          const available = getHanzi(initial, final, t) !== null;

          if (!available) {
            return (
              <div
                key={t}
                className="relative flex flex-col items-center rounded-2xl bg-gray-50
                           border border-dashed border-gray-200 py-6 gap-1.5
                           opacity-50 cursor-not-allowed select-none"
              >
                <span className="text-5xl font-bold text-gray-300">{TONE_MARKS_DISPLAY[t]}</span>
                <span className="text-sm text-gray-400">{TONE_NAMES[t]}</span>
                <span className="text-xs font-medium text-gray-400 mt-1">Không tồn tại</span>
              </div>
            );
          }

          return (
            <Link
              key={t}
              data-tap
              href={`/luyen-phat-am/luyen?initial=${encodeURIComponent(initial)}&final=${encodeURIComponent(final)}&tone=${t}`}
              className="flex flex-col items-center rounded-2xl bg-white border border-gray-100
                         shadow-sm py-6 gap-1.5
                         hover:bg-emerald-50 hover:border-emerald-300 transition"
            >
              <span className="text-5xl font-bold text-gray-800">{TONE_MARKS_DISPLAY[t]}</span>
              <span className="text-sm text-gray-500">{TONE_NAMES[t]}</span>
              <span className="text-xl font-bold text-emerald-600 mt-1">{buildPinyin(initial, final, t)}</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
