"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
      if (!res.ok) { setError(data.error ?? "Đăng nhập thất bại."); return; }
      router.push("/luyen-phat-am");
      router.refresh();
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">

        {/* ── Logo ảnh thật ── */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="relative h-36 w-36 overflow-hidden rounded-full shadow-xl ring-4 ring-white">
            <Image
              src="/logo.png"
              alt="Tiếng Trung Bùi Nga"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Tiếng Trung Bùi Nga</h1>
            <p className="mt-0.5 text-sm text-gray-500">Cùng luyện phát âm nhé!</p>
          </div>
        </div>

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl bg-white p-6 shadow-md ring-1 ring-gray-200"
        >
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-800">
              Tên học viên
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên của bạn..."
              autoComplete="username"
              style={{ color: "#111827", WebkitTextFillColor: "#111827" }}
              className="w-full rounded-xl border border-gray-400 bg-gray-100 px-4 py-3
                         text-sm placeholder-gray-400 outline-none transition
                         focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-800">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              autoComplete="current-password"
              style={{ color: "#111827", WebkitTextFillColor: "#111827" }}
              className="w-full rounded-xl border border-gray-400 bg-gray-100 px-4 py-3
                         text-sm placeholder-gray-400 outline-none transition
                         focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold
                       text-white shadow-sm transition hover:bg-red-700
                       active:scale-95 disabled:opacity-60"
          >
            {loading ? "Đang vào..." : "Vào học ngay"}
          </button>

          <p className="text-center text-xs text-gray-400">
            Tên mới → tự tạo tài khoản · Tên cũ → đăng nhập ngay 🎉
          </p>
        </form>

        <p className="mt-5 text-center text-xs text-gray-400">
          Hỗ trợ: Zalo{" "}
          <a href="tel:0368004855" className="font-semibold text-green-700">
            036 800 4855
          </a>
        </p>
      </div>
    </main>
  );
}
