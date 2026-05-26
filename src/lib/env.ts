import { z } from "zod";

const runtimeEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  BATTLENET_CLIENT_ID: z.string().min(1),
  BATTLENET_CLIENT_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export function hasRequiredRuntimeEnv() {
  return runtimeEnvSchema.safeParse(process.env).success;
}

export function getRuntimeEnv(): RuntimeEnv {
  const result = runtimeEnvSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Missing runtime env: ${result.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  return result.data;
}
