import { z } from "zod";

export const eventActivityTypeSchema = z.enum([
  "raid",
  "dungeon",
  "open-world",
]);
export const eventLeaderModeSchema = z.enum(["character", "manual"]);
export const eventTimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100);

export const roleRangeSchema = z
  .object({
    max: z.number().int().min(0).max(100),
    min: z.number().int().min(0).max(100),
  })
  .refine((range) => range.min <= range.max, {
    message: "Role minimum cannot be greater than maximum.",
  });

export const scheduledEventInputSchema = z
  .object({
    activityType: eventActivityTypeSchema,
    addon: z.string().trim().min(1).max(80),
    characterId: z.string().trim().max(100),
    clientRequestId: z.string().uuid(),
    contentScope: z.string().trim().min(1).max(100),
    date: z.string().trim(),
    difficulty: z.string().trim().min(1).max(80),
    hasPaidSlots: z.boolean(),
    hasUnroll: z.boolean(),
    leaderMode: eventLeaderModeSchema,
    manualLeaderName: z.string().trim().max(80),
    manualLeaderRealm: z.string().trim().max(80),
    paidSlotPrice: z.number().int().min(0).max(2_000_000_000),
    paidSlots: z.number().int().min(0).max(100),
    publishTargets: z
      .object({
        app: z.boolean(),
        discord: z.boolean(),
        telegram: z.boolean(),
      })
      .strict(),
    roles: z
      .object({
        damage: roleRangeSchema,
        healer: roleRangeSchema,
        tank: roleRangeSchema,
      })
      .strict(),
    selectedInstanceSlugs: z
      .array(z.string().trim().min(1).max(100))
      .min(1)
      .max(30),
    time: z.string().trim(),
    timeZone: eventTimeZoneSchema,
    unrollInput: z.string().max(4_000),
    unrollItemIds: z.array(z.string().max(40)).max(100),
    unrollTemplateId: z.string().max(100),
  })
  .strict();

export const eventTemplatePayloadSchema = scheduledEventInputSchema.omit({
  clientRequestId: true,
  date: true,
});

export type ScheduledEventInput = z.infer<typeof scheduledEventInputSchema>;
export type EventTemplatePayload = z.infer<typeof eventTemplatePayloadSchema>;
