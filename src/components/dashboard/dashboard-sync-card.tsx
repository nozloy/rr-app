"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import {
  syncCharactersAction,
  type SyncActionState,
} from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { t, type AppLocale } from "@/lib/i18n";

const initialState: SyncActionState = {
  status: "idle",
  message: "",
};

export function DashboardSyncCard({ locale }: { locale: AppLocale }) {
  const [state, action, isPending] = useActionState(
    syncCharactersAction,
    initialState,
  );

  return (
    <div className="dashboard-sync-card">
      <div className="dashboard-sync-copy">
        <RefreshCw className="size-5" aria-hidden="true" />
        <div>
          <span>{t(locale, "dashboard.sync")}</span>
          <strong>
            {state.status === "success"
              ? t(locale, "dashboard.dataUpdated")
              : t(locale, "dashboard.dataCurrent")}
          </strong>
          <small>{state.message || (locale === "ru" ? "2 мин. назад" : "2 min ago")}</small>
        </div>
      </div>

      <form action={action}>
        <Button className="dashboard-sync-button" disabled={isPending} type="submit">
          {isPending ? (
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          )}
          {isPending ? t(locale, "dashboard.syncing") : t(locale, "dashboard.syncNow")}
        </Button>
      </form>

      {state.status === "reauth" ? (
        <Button
          className="dashboard-sync-button"
          onClick={() => signIn("battlenet", { callbackUrl: "/dashboard" })}
          type="button"
          variant="outline"
        >
          {t(locale, "dashboard.reconnectBattleNet")}
        </Button>
      ) : null}
    </div>
  );
}
