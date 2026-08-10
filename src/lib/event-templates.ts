import type { EventTemplate } from "@prisma/client";
import {
  eventTemplatePayloadSchema,
  type EventTemplatePayload,
} from "@/lib/event-schema";

export const EVENT_TEMPLATE_SCHEMA_VERSION = 1;

export type EventTemplateDto = {
  id: string;
  name: string;
  payload: EventTemplatePayload;
  updatedAt: string;
};

export function normalizeTemplateName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru-RU");
}

export function toEventTemplateDto(
  template: Pick<
    EventTemplate,
    "id" | "name" | "payload" | "schemaVersion" | "updatedAt"
  >,
): EventTemplateDto | null {
  if (template.schemaVersion !== EVENT_TEMPLATE_SCHEMA_VERSION) {
    return null;
  }

  const payload = eventTemplatePayloadSchema.safeParse(template.payload);

  if (!payload.success) {
    return null;
  }

  return {
    id: template.id,
    name: template.name,
    payload: payload.data,
    updatedAt: template.updatedAt.toISOString(),
  };
}
