"use client";

export function LogoutButton() {
  const handleLogout = () => {
    // Xóa token ghi nhớ để không bị tự đăng nhập lại, rồi xóa cookie phía server
    try { localStorage.removeItem("ltc_remember"); } catch { /* noop */ }
    window.location.href = "/api/auth/logout";
  };

  return (
    <button
      data-tap
      onClick={handleLogout}
      className="block w-full rounded-xl border border-gray-200 bg-white py-3 text-center
                 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
    >
      Đăng xuất
    </button>
  );
}
