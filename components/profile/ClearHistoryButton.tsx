"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClearHistoryButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleClear = async () => {
    if (!confirming) { setConfirming(true); return; }   // bước 1: yêu cầu xác nhận
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/profile/clear-history", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Xóa thất bại."); return; }
      setConfirming(false);
      router.refresh();   // tải lại dữ liệu hồ sơ
    } catch {
      setError("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          data-tap
          onClick={handleClear}
          disabled={loading}
          className={[
            "flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold transition",
            confirming
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border border-red-200 bg-white text-red-600 hover:bg-red-50",
            loading ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {loading ? "Đang xóa..." : confirming ? "Nhấn lần nữa để xóa" : "Xóa lịch sử luyện tập"}
        </button>

        {confirming && !loading && (
          <button
            data-tap
            onClick={() => setConfirming(false)}
            className="rounded-xl py-2.5 px-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
          >
            Hủy
          </button>
        )}
      </div>

      {confirming && (
        <p className="text-xs text-gray-400">
          Chỉ xóa lịch sử luyện tập của bạn — tài khoản vẫn được giữ nguyên.
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
