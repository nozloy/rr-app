import { createHash } from "node:crypto";
import type {
  EventDeliveryStatus,
  ExternalPublishTarget,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DELIVERY_TIMEOUT_MS = 8_000;
const DELIVERY_LOCK_MS = 120_000;

export const eventPublicationInclude = {
  activities: {
    include: { activity: true },
    orderBy: [{ sortOrder: "asc" as const }],
  },
  deliveries: true,
  difficulty: true,
} satisfies Prisma.ScheduledEventInclude;

export type EventForPublication = Prisma.ScheduledEventGetPayload<{
  include: typeof eventPublicationInclude;
}>;

export type EventChannelAvailability = {
  discord: boolean;
  telegram: boolean;
};

export type DeliverySummary = {
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  status: EventDeliveryStatus;
  target: ExternalPublishTarget;
};

type DiscordConfig = {
  fingerprint: string;
  publicBaseUrl: string;
  webhookUrl: string;
};

type TelegramConfig = {
  botToken: string;
  chatId: string;
  fingerprint: string;
  publicBaseUrl: string;
};

class DeliveryError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getPublicBaseUrl() {
  const rawValue = process.env.NEXTAUTH_URL?.trim();

  if (!rawValue) {
    return null;
  }

  try {
    const url = new URL(rawValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function getDiscordConfig(): DiscordConfig | null {
  const webhookUrl = process.env.DISCORD_EVENT_WEBHOOK_URL?.trim();
  const publicBaseUrl = getPublicBaseUrl();

  if (!webhookUrl || !publicBaseUrl) {
    return null;
  }

  try {
    const url = new URL(webhookUrl);

    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith("discord.com") ||
      !url.pathname.includes("/api/webhooks/")
    ) {
      return null;
    }

    return {
      fingerprint: fingerprint(webhookUrl),
      publicBaseUrl,
      webhookUrl,
    };
  } catch {
    return null;
  }
}

function getTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_EVENT_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_EVENT_CHAT_ID?.trim();
  const publicBaseUrl = getPublicBaseUrl();

  if (
    !botToken ||
    !/^\d+:[A-Za-z0-9_-]+$/.test(botToken) ||
    !chatId ||
    !publicBaseUrl
  ) {
    return null;
  }

  return {
    botToken,
    chatId,
    fingerprint: fingerprint(`${botToken}:${chatId}`),
    publicBaseUrl,
  };
}

export function getEventChannelAvailability(): EventChannelAvailability {
  return {
    discord: getDiscordConfig() !== null,
    telegram: getTelegramConfig() !== null,
  };
}

function activityTypeLabel(event: EventForPublication) {
  if (event.activityType === "RAID") {
    return "Рейд";
  }

  if (event.activityType === "DUNGEON") {
    return "Подземелье";
  }

  return "Мир";
}

function formatRange(min: number, max: number) {
  return min === max ? String(min) : `${min}–${max}`;
}

function formatPublicationText(
  event: EventForPublication,
  publicBaseUrl: string,
) {
  const activities = event.activities
    .map(({ activity }) => activity.nameRu)
    .join(", ");
  const lines = [
    `${event.status === "CANCELLED" ? "[ОТМЕНЕНО] " : ""}${activities || "Событие RaidReminder"}`,
    `${activityTypeLabel(event)} · ${event.difficulty.labelRu}`,
    `Когда: ${event.localDate} в ${event.localTime} (${event.timeZone})`,
    `Лидер: ${event.leaderName}-${event.leaderRealm}`,
    `Состав: танки ${formatRange(event.tankMin, event.tankMax)}, хиллеры ${formatRange(event.healerMin, event.healerMax)}, дамагеры ${formatRange(event.damageMin, event.damageMax)}`,
  ];

  if (event.hasPaidSlots) {
    lines.push(
      `Платные места: ${event.paidSlots}, цена ${event.paidSlotPrice.toLocaleString("ru-RU")} золота`,
    );
  }

  if (event.hasUnroll && event.unrollItemIds.length > 0) {
    lines.push(`Анролл: ${event.unrollItemIds.join(", ")}`);
  }

  lines.push(`${publicBaseUrl}/events/${event.id}`);

  return lines.join("\n");
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DeliveryError("DELIVERY_TIMEOUT", "Канал не ответил вовремя.");
    }

    throw new DeliveryError("NETWORK_ERROR", "Не удалось связаться с каналом.");
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureOk(response: Response, target: ExternalPublishTarget) {
  if (!response.ok) {
    throw new DeliveryError(
      `${target}_HTTP_${response.status}`,
      `${target === "DISCORD" ? "Discord" : "Telegram"} вернул ошибку ${response.status}.`,
    );
  }
}

async function sendDiscord(config: DiscordConfig, content: string) {
  const url = new URL(config.webhookUrl);
  url.searchParams.set("wait", "true");
  const response = await fetchWithTimeout(url.toString(), {
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      content: content.slice(0, 2_000),
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  await ensureOk(response, "DISCORD");
  const body = (await response.json().catch(() => null)) as
    | { id?: unknown }
    | null;

  if (typeof body?.id !== "string") {
    throw new DeliveryError(
      "DISCORD_INVALID_RESPONSE",
      "Discord не вернул идентификатор сообщения.",
    );
  }

  return body.id;
}

async function editDiscord(
  config: DiscordConfig,
  remoteMessageId: string,
  content: string,
) {
  const response = await fetchWithTimeout(
    `${config.webhookUrl}/messages/${encodeURIComponent(remoteMessageId)}`,
    {
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        content: content.slice(0, 2_000),
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    },
  );
  await ensureOk(response, "DISCORD");
}

async function deleteDiscord(
  config: DiscordConfig,
  remoteMessageId: string,
) {
  const response = await fetchWithTimeout(
    `${config.webhookUrl}/messages/${encodeURIComponent(remoteMessageId)}`,
    { method: "DELETE" },
  );
  await ensureOk(response, "DISCORD");
}

async function callTelegram(
  config: TelegramConfig,
  method: string,
  body: Record<string, unknown>,
) {
  const response = await fetchWithTimeout(
    `https://api.telegram.org/bot${config.botToken}/${method}`,
    {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  await ensureOk(response, "TELEGRAM");
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; result?: unknown }
    | null;

  if (!payload?.ok) {
    throw new DeliveryError(
      "TELEGRAM_INVALID_RESPONSE",
      "Telegram не подтвердил операцию.",
    );
  }

  return payload.result;
}

async function sendTelegram(config: TelegramConfig, text: string) {
  const result = (await callTelegram(config, "sendMessage", {
    chat_id: config.chatId,
    disable_web_page_preview: true,
    text: text.slice(0, 4_096),
  })) as { message_id?: unknown } | null;

  if (typeof result?.message_id !== "number") {
    throw new DeliveryError(
      "TELEGRAM_INVALID_RESPONSE",
      "Telegram не вернул идентификатор сообщения.",
    );
  }

  return String(result.message_id);
}

async function editTelegram(
  config: TelegramConfig,
  remoteMessageId: string,
  text: string,
) {
  await callTelegram(config, "editMessageText", {
    chat_id: config.chatId,
    disable_web_page_preview: true,
    message_id: Number(remoteMessageId),
    text: text.slice(0, 4_096),
  });
}

async function deleteTelegram(
  config: TelegramConfig,
  remoteMessageId: string,
) {
  await callTelegram(config, "deleteMessage", {
    chat_id: config.chatId,
    message_id: Number(remoteMessageId),
  });
}

function toSummary(
  delivery: Pick<
    EventForPublication["deliveries"][number],
    "lastErrorCode" | "lastErrorMessage" | "status" | "target"
  >,
): DeliverySummary {
  return {
    lastErrorCode: delivery.lastErrorCode,
    lastErrorMessage: delivery.lastErrorMessage,
    status: delivery.status,
    target: delivery.target,
  };
}

async function processDelivery(
  event: EventForPublication,
  target: ExternalPublishTarget,
) {
  const selected = event.publishTargets.includes(target);
  let delivery = event.deliveries.find((item) => item.target === target);

  if (!delivery) {
    if (!selected) {
      return null;
    }

    delivery = await prisma.scheduledEventDelivery.create({
      data: { eventId: event.id, target },
    });
  }

  const staleBefore = new Date(Date.now() - DELIVERY_LOCK_MS);
  const claim = await prisma.scheduledEventDelivery.updateMany({
    data: {
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
      status: "PENDING",
    },
    where: {
      id: delivery.id,
      OR: [
        { status: { not: "PENDING" } },
        { lastAttemptAt: null },
        { lastAttemptAt: { lt: staleBefore } },
      ],
    },
  });

  if (claim.count === 0) {
    return toSummary({
      ...delivery,
      lastErrorCode: null,
      lastErrorMessage: null,
      status: "PENDING",
    });
  }

  try {
    if (!delivery.remoteMessageId && (!selected || event.status === "CANCELLED")) {
      const status = !selected
        ? "REMOVED"
        : event.status === "CANCELLED"
          ? "CANCELLED"
          : "REMOVED";
      const updated = await prisma.scheduledEventDelivery.update({
        data: { status },
        where: { id: delivery.id },
      });
      return toSummary(updated);
    }

    const config = target === "DISCORD" ? getDiscordConfig() : getTelegramConfig();

    if (!config) {
      throw new DeliveryError(
        "CHANNEL_NOT_CONFIGURED",
        `${target === "DISCORD" ? "Discord" : "Telegram"} не настроен на сервере.`,
      );
    }

    if (
      delivery.remoteMessageId &&
      delivery.destinationFingerprint &&
      delivery.destinationFingerprint !== config.fingerprint
    ) {
      throw new DeliveryError(
        "DESTINATION_CHANGED",
        "Назначение канала изменилось; исходное сообщение нельзя безопасно обновить.",
      );
    }

    const content = formatPublicationText(event, config.publicBaseUrl);
    let remoteMessageId = delivery.remoteMessageId;
    let status: EventDeliveryStatus = "SENT";

    if (event.status === "CANCELLED") {
      if (target === "DISCORD") {
        await editDiscord(config as DiscordConfig, remoteMessageId!, content);
      } else {
        await editTelegram(config as TelegramConfig, remoteMessageId!, content);
      }
      status = "CANCELLED";
    } else if (!selected) {
      if (target === "DISCORD") {
        await deleteDiscord(config as DiscordConfig, remoteMessageId!);
      } else {
        await deleteTelegram(config as TelegramConfig, remoteMessageId!);
      }
      remoteMessageId = null;
      status = "REMOVED";
    } else if (remoteMessageId) {
      if (target === "DISCORD") {
        await editDiscord(config as DiscordConfig, remoteMessageId, content);
      } else {
        await editTelegram(config as TelegramConfig, remoteMessageId, content);
      }
    } else if (target === "DISCORD") {
      remoteMessageId = await sendDiscord(config as DiscordConfig, content);
    } else {
      remoteMessageId = await sendTelegram(config as TelegramConfig, content);
    }

    const updated = await prisma.scheduledEventDelivery.update({
      data: {
        destinationFingerprint: config.fingerprint,
        lastErrorCode: null,
        lastErrorMessage: null,
        remoteMessageId,
        status,
      },
      where: { id: delivery.id },
    });
    return toSummary(updated);
  } catch (error) {
    const code = error instanceof DeliveryError ? error.code : "UNKNOWN_ERROR";
    const message =
      error instanceof DeliveryError
        ? error.message
        : "Не удалось выполнить публикацию.";
    const updated = await prisma.scheduledEventDelivery.update({
      data: {
        lastErrorCode: code,
        lastErrorMessage: message,
        status: "FAILED",
      },
      where: { id: delivery.id },
    });
    return toSummary(updated);
  }
}

export async function deliverScheduledEvent(
  eventId: string,
  requestedTargets?: ExternalPublishTarget[],
) {
  const event = await prisma.scheduledEvent.findUnique({
    include: eventPublicationInclude,
    where: { id: eventId },
  });

  if (!event) {
    return [];
  }

  const availableTargets = new Set<ExternalPublishTarget>();

  for (const target of event.publishTargets) {
    if (target === "DISCORD" || target === "TELEGRAM") {
      availableTargets.add(target);
    }
  }

  for (const delivery of event.deliveries) {
    availableTargets.add(delivery.target);
  }

  const targets = requestedTargets
    ? requestedTargets.filter((target) => availableTargets.has(target))
    : [...availableTargets];
  const results = await Promise.all(
    targets.map((target) => processDelivery(event, target)),
  );

  return results.filter((result): result is DeliverySummary => result !== null);
}
