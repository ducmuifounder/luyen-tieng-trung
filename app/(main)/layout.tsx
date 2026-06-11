export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-bold text-red-600">学中文</span>
          <span className="text-sm text-gray-500">Luyện Tiếng Trung</span>
        </div>
      </nav>
      {children}
    </div>
  );
}
