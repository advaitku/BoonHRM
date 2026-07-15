import { redirect } from "next/navigation";

// User management moved into Settings → Users.
export default function UsersPageRedirect() {
  redirect("/admin/settings");
}
