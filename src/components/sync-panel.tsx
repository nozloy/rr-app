"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import {
  syncCharactersAction,
  type SyncActionState,
} from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const initialState: SyncActionState = {
  status: "idle",
  message: "",
};

export function SyncPanel() {
  const [state, action, isPending] = useActionState(
    syncCharactersAction,
    initialState,
  );

  return (
    <Card className="surface-card rounded-2xl">
      <RefreshCw className="background-icon" aria-hidden="true" />
      <CardContent className="p-6">
        <div className="panel-heading">
          <div className="max-w-2xl space-y-4">
            <div className="eyebrow">Синхронизация</div>
            <h2 className="section-title">Обновить персонажей</h2>
            <p className="subtle m-0 leading-7">
              Запросим Battle.net, обновим ilvl и пометим пропавших персонажей
              как неактивных, чтобы конструктор показывал актуальный пул.
            </p>
            <div className="sync-points">
              <div className="sync-point">Профиль и текущий item level</div>
              <div className="sync-point">Реалм, фракция, класс и активный спек</div>
              <div className="sync-point">Защита от устаревших персонажей</div>
            </div>
          </div>

          <form action={action}>
            <Button disabled={isPending} type="submit">
              <RefreshCw className="size-4" aria-hidden="true" />
              {isPending ? "Обновляем..." : "Обновить персонажей"}
            </Button>
          </form>
        </div>

        {state.message ? (
          <div className={`status-note mt-5 ${state.status === "error" ? "error" : ""}`}>
            <p className="m-0">{state.message}</p>
            {typeof state.importedCount === "number" ? (
              <p className="mt-2 mb-0 text-sm opacity-80">
                Импорт: {state.importedCount} · Обновлено: {state.updatedCount} ·
                Ошибок: {state.failedCount}
              </p>
            ) : null}

            {state.status === "reauth" ? (
              <Button
                className="mt-3"
                onClick={() => signIn("battlenet", { callbackUrl: "/dashboard" })}
                type="button"
                variant="outline"
              >
                Переподключить Battle.net
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
