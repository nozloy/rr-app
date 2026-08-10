import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function getOptionalSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();

  if (!session.user.isAdmin) {
    redirect("/profile");
  }

  return session;
}
