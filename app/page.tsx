import { redirect } from "next/navigation";

// Root luôn về /login — middleware sẽ tự redirect sang /luyen-phat-am nếu đã đăng nhập
export default function Home() {
  redirect("/login");
}
