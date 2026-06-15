import Link from "next/link";
import { INITIAL_GROUPS } from "@/lib/pinyin-data";

export const metadata = { title: "Luyện phát âm | Tiếng Trung Bùi Nga" };

export default function SelectInitialPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/profile" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Bước 1 / 3</p>
          <h1 className="text-xl font-bold text-gray-800">Chọn Thanh mẫu</h1>
        </div>
      </div>

      {/* Nhóm thanh mẫu */}
      <div className="space-y-5">
        {INITIAL_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {group.label}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {group.items.map((initial) => (
                <Link
                  key={initial}
                  data-tap
                  href={`/luyen-phat-am/van-mau?initial=${encodeURIComponent(initial)}`}
                  className="flex items-center justify-center rounded-2xl bg-white border border-gray-100
                             shadow-sm py-5 text-2xl font-bold text-gray-800
                             hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 transition"
                >
                  {initial}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
