"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncCharactersForUser } from "@/lib/character-sync";

export type SyncActionState = {
  status: "idle" | "success" | "error" | "reauth";
  message: string;
  importedCount?: number;
  updatedCount?: number;
  failedCount?: number;
};

export async function syncCharactersAction(): Promise<SyncActionState>;
export async function syncCharactersAction(
  _prevState?: SyncActionState,
  _formData?: FormData,
): Promise<SyncActionState> {
  void _prevState;
  void _formData;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "error",
      message: "Нужно снова войти в систему.",
    };
  }

  const result = await syncCharactersForUser(session.user.id);

  revalidatePath("/dashboard");
  revalidatePath("/banners/new");

  return {
    status: result.status,
    message: result.message,
    importedCount: result.importedCount,
    updatedCount: result.updatedCount,
    failedCount: result.failedCount,
  };
}
