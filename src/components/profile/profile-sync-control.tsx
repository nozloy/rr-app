"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import {
  ArrowsClockwise,
  CheckCircle,
} from "@phosphor-icons/react";
import {
  syncCharactersAction,
  type SyncActionState,
} from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n";

const initialState: SyncActionState = {
  status: "idle",
  message: "",
};

export function ProfileSyncControl({ locale }: { locale: AppLocale }) {
  const [state, action, isPending] = useActionState(
    syncCharactersAction,
    initialState,
  );
  const isRussian = locale === "ru";

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <form action={action}>
        <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
          <ArrowsClockwise
            data-icon="inline-start"
            aria-hidden="true"
            className={isPending ? "animate-spin" : undefined}
          />
          {isPending
            ? isRussian
              ? "Синхронизация…"
              : "Syncing…"
            : isRussian
              ? "Синхронизировать"
              : "Sync characters"}
        </Button>
      </form>

      {state.status === "reauth" ? (
        <Button
          onClick={() => signIn("battlenet", { callbackUrl: "/profile?tab=characters" })}
          type="button"
          variant="outline"
        >
          <ArrowsClockwise data-icon="inline-start" aria-hidden="true" />
          {isRussian ? "Переподключить Battle.net" : "Reconnect Battle.net"}
        </Button>
      ) : null}

      {state.message ? (
        <p
          className="flex max-w-sm items-center gap-1.5 text-xs text-muted-foreground"
          role="status"
        >
          {state.status === "success" ? <CheckCircle aria-hidden="true" /> : null}
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
