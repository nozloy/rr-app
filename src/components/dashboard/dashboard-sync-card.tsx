"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import {
  syncCharactersAction,
  type SyncActionState,
} from "@/actions/dashboard";
import { Button } from "@/components/ui/button";

const initialState: SyncActionState = {
  status: "idle",
  message: "",
};

export function DashboardSyncCard() {
  const [state, action, isPending] = useActionState(
    syncCharactersAction,
    initialState,
  );

  return (
    <div className="dashboard-sync-card">
      <div className="dashboard-sync-copy">
        <RefreshCw className="size-5" aria-hidden="true" />
        <div>
          <span>Синхронизация</span>
          <strong>
            {state.status === "success" ? "Данные обновлены" : "Данные актуальны"}
          </strong>
          <small>{state.message || "2 мин. назад"}</small>
        </div>
      </div>

      <form action={action}>
        <Button className="dashboard-sync-button" disabled={isPending} type="submit">
          {isPending ? (
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          )}
          {isPending ? "Обновляем..." : "Синхронизировать"}
        </Button>
      </form>

      {state.status === "reauth" ? (
        <Button
          className="dashboard-sync-button"
          onClick={() => signIn("battlenet", { callbackUrl: "/dashboard" })}
          type="button"
          variant="outline"
        >
          Переподключить Battle.net
        </Button>
      ) : null}
    </div>
  );
}
