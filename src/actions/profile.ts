"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getRequestLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

const characterIdSchema = z.string().trim().min(1).max(128);

export type SetMainCharacterResult = {
  status: "success" | "error";
  message: string;
};

export async function setMainCharacterAction(
  characterId: string,
): Promise<SetMainCharacterResult> {
  const [locale, session] = await Promise.all([
    getRequestLocale(),
    getServerSession(authOptions),
  ]);

  if (!session?.user?.id) {
    return {
      status: "error",
      message:
        locale === "ru"
          ? "Нужно снова войти в систему."
          : "Please sign in again.",
    };
  }

  const parsedId = characterIdSchema.safeParse(characterId);

  if (!parsedId.success) {
    return {
      status: "error",
      message:
        locale === "ru"
          ? "Не удалось определить персонажа."
          : "Could not identify the character.",
    };
  }

  const character = await prisma.character.findFirst({
    select: { id: true },
    where: {
      id: parsedId.data,
      isActive: true,
      userId: session.user.id,
    },
  });

  if (!character) {
    return {
      status: "error",
      message:
        locale === "ru"
          ? "Можно выбрать только активного персонажа своего аккаунта."
          : "You can only select an active character from your account.",
    };
  }

  await prisma.user.update({
    data: { mainCharacterId: character.id },
    where: { id: session.user.id },
  });

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  revalidatePath("/events/new");
  revalidatePath("/banners/new");

  return {
    status: "success",
    message:
      locale === "ru"
        ? "Главный персонаж обновлён."
        : "Main character updated.",
  };
}
