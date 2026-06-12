"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ tên và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Đăng nhập thất bại.");
        return;
      }

      router.push("/luyen-phat-am");
      router.refresh();
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 to-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🇨🇳</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tiếng Trung Bùi Nga
          </h1>
          <p className="mt-1 text-sm text-gray-500">Cùng luyện phát âm nhé!</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Tên học viên
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên của bạn..."
              autoComplete="username"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm
                         outline-none transition focus:border-red-400 focus:ring-2
                         focus:ring-red-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm
                         outline-none transition focus:border-red-400 focus:ring-2
                         focus:ring-red-100"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-semibold
                       text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Đang vào..." : "Vào học ngay"}
          </button>

          <p className="text-center text-xs text-gray-400">
            Tên mới? Hệ thống tự tạo tài khoản cho bạn 🎉
          </p>
        </form>
      </div>
    </main>
  );
}
