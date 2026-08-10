"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { eventTemplatePayloadSchema } from "@/lib/event-schema";
import {
  EVENT_TEMPLATE_SCHEMA_VERSION,
  normalizeTemplateName,
  toEventTemplateDto,
  type EventTemplateDto,
} from "@/lib/event-templates";
import { prisma } from "@/lib/prisma";

export type EventTemplateActionResult =
  | {
      status: "success";
      message: string;
      template?: EventTemplateDto;
    }
  | {
      status: "conflict";
      message: string;
      existingTemplateId: string;
    }
  | {
      status: "error";
      message: string;
    };

const templateNameSchema = z.string().trim().min(1).max(60);

async function currentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function saveEventTemplateAction(input: {
  name: string;
  payload: unknown;
  replace?: boolean;
}): Promise<EventTemplateActionResult> {
  const userId = await currentUserId();

  if (!userId) {
    return { message: "Нужно войти в систему.", status: "error" };
  }

  const parsed = z
    .object({
      name: templateNameSchema,
      payload: eventTemplatePayloadSchema,
      replace: z.boolean().optional().default(false),
    })
    .safeParse(input);

  if (!parsed.success) {
    return { message: "Проверьте название и параметры шаблона.", status: "error" };
  }

  const normalizedName = normalizeTemplateName(parsed.data.name);
  const existing = await prisma.eventTemplate.findUnique({
    select: { id: true },
    where: { userId_normalizedName: { normalizedName, userId } },
  });

  if (existing && !parsed.data.replace) {
    return {
      existingTemplateId: existing.id,
      message: "Шаблон с таким названием уже существует.",
      status: "conflict",
    };
  }

  try {
    const template = existing
      ? await prisma.eventTemplate.update({
          data: {
            name: parsed.data.name,
            payload: parsed.data.payload,
            schemaVersion: EVENT_TEMPLATE_SCHEMA_VERSION,
          },
          where: { id: existing.id },
        })
      : await prisma.eventTemplate.create({
          data: {
            name: parsed.data.name,
            normalizedName,
            payload: parsed.data.payload,
            schemaVersion: EVENT_TEMPLATE_SCHEMA_VERSION,
            userId,
          },
        });
    const dto = toEventTemplateDto(template);

    revalidatePath("/events/new");
    return {
      message: existing ? "Шаблон заменён." : "Шаблон сохранён.",
      status: "success",
      ...(dto ? { template: dto } : {}),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const collision = await prisma.eventTemplate.findUnique({
        select: { id: true },
        where: { userId_normalizedName: { normalizedName, userId } },
      });

      if (collision) {
        return {
          existingTemplateId: collision.id,
          message: "Шаблон с таким названием уже существует.",
          status: "conflict",
        };
      }
    }

    console.error("Failed to save event template", error);
    return { message: "Не удалось сохранить шаблон.", status: "error" };
  }
}

export async function renameEventTemplateAction(input: {
  id: string;
  name: string;
}): Promise<EventTemplateActionResult> {
  const userId = await currentUserId();

  if (!userId) {
    return { message: "Нужно войти в систему.", status: "error" };
  }

  const parsed = z
    .object({ id: z.string().min(1), name: templateNameSchema })
    .safeParse(input);

  if (!parsed.success) {
    return { message: "Укажите корректное название.", status: "error" };
  }

  const normalizedName = normalizeTemplateName(parsed.data.name);
  const collision = await prisma.eventTemplate.findFirst({
    select: { id: true },
    where: {
      id: { not: parsed.data.id },
      normalizedName,
      userId,
    },
  });

  if (collision) {
    return {
      existingTemplateId: collision.id,
      message: "Шаблон с таким названием уже существует.",
      status: "conflict",
    };
  }

  try {
    const update = await prisma.eventTemplate.updateMany({
      data: { name: parsed.data.name, normalizedName },
      where: { id: parsed.data.id, userId },
    });

    if (update.count !== 1) {
      return { message: "Шаблон не найден.", status: "error" };
    }

    revalidatePath("/events/new");
    return { message: "Шаблон переименован.", status: "success" };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const conflictingTemplate = await prisma.eventTemplate.findUnique({
        select: { id: true },
        where: { userId_normalizedName: { normalizedName, userId } },
      });

      if (conflictingTemplate) {
        return {
          existingTemplateId: conflictingTemplate.id,
          message: "Шаблон с таким названием уже существует.",
          status: "conflict",
        };
      }
    }

    console.error("Failed to rename event template", error);
    return { message: "Не удалось переименовать шаблон.", status: "error" };
  }
}

export async function deleteEventTemplateAction(
  templateId: string,
): Promise<EventTemplateActionResult> {
  const userId = await currentUserId();

  if (!userId) {
    return { message: "Нужно войти в систему.", status: "error" };
  }

  const parsedId = z.string().min(1).safeParse(templateId);

  if (!parsedId.success) {
    return { message: "Некорректный шаблон.", status: "error" };
  }

  try {
    const result = await prisma.eventTemplate.deleteMany({
      where: { id: parsedId.data, userId },
    });

    if (result.count !== 1) {
      return { message: "Шаблон не найден.", status: "error" };
    }

    revalidatePath("/events/new");
    return { message: "Шаблон удалён.", status: "success" };
  } catch (error) {
    console.error("Failed to delete event template", error);
    return { message: "Не удалось удалить шаблон.", status: "error" };
  }
}
