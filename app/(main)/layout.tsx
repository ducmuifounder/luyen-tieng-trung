import Link from "next/link";
import { getSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let username = "";

  if (session) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("students")
      .select("username")
      .eq("id", session.studentId)
      .single();
    username = data?.username ?? "";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/luyen-phat-am" className="text-lg font-bold text-red-600">
            学中文
          </Link>

          <div className="flex items-center gap-3">
            {username && (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5
                           text-sm font-medium text-red-700 hover:bg-red-100 transition"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-xs font-bold">
                  {username[0].toUpperCase()}
                </span>
                {username}
              </Link>
            )}
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
