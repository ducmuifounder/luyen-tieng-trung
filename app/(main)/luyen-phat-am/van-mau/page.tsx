import Link from "next/link";
import { redirect } from "next/navigation";
import { VALID_FINALS_FOR_INITIAL, ALL_FINALS, displayFinalName } from "@/lib/pinyin-data";

interface Props {
  searchParams: Promise<{ initial?: string }>;
}

export default async function SelectFinalPage({ searchParams }: Props) {
  const params  = await searchParams;
  const initial = params.initial ?? "";

  if (!initial || !VALID_FINALS_FOR_INITIAL[initial]) redirect("/luyen-phat-am");

  const validSet   = new Set(VALID_FINALS_FOR_INITIAL[initial]);
  const validFinals = ALL_FINALS.filter((f) => validSet.has(f));

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/luyen-phat-am" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Bước 2 / 3</p>
          <h1 className="text-xl font-bold text-gray-800">
            <span className="text-emerald-600">{initial}</span>
            <span className="text-gray-300 mx-2">+</span>
            Chọn Vận mẫu
          </h1>
        </div>
      </div>

      {/* Vận mẫu hợp lệ */}
      <div className="grid grid-cols-4 gap-2">
        {validFinals.map((f) => (
          <Link
            key={f}
            data-tap
            href={`/luyen-phat-am/thanh-dieu?initial=${encodeURIComponent(initial)}&final=${encodeURIComponent(f)}`}
            className="flex items-center justify-center rounded-2xl bg-white border border-gray-100
                       shadow-sm py-4 text-lg font-semibold text-gray-800
                       hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 transition"
          >
            {displayFinalName(f)}
          </Link>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400">
        {validFinals.length} vận mẫu hợp lệ với <strong>{initial}</strong>
      </p>
    </main>
  );
}
