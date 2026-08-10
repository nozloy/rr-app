"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import {
  setMainCharacterAction,
  type SetMainCharacterResult,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppLocale } from "@/lib/i18n";

type ProfileCharacterActionsProps = {
  characterId: string;
  isActive: boolean;
  isMain: boolean;
  locale: AppLocale;
};

export function ProfileCharacterActions({
  characterId,
  isActive,
  isMain,
  locale,
}: ProfileCharacterActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SetMainCharacterResult | null>(null);
  const isRussian = locale === "ru";

  function setAsMainCharacter() {
    startTransition(async () => {
      const nextResult = await setMainCharacterAction(characterId);
      setResult(nextResult);

      if (nextResult.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={isRussian ? "Действия персонажа" : "Character actions"}
          disabled={isPending}
          size="icon"
          type="button"
          variant="ghost"
        >
          <DotsThreeVertical data-icon="inline-start" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {isRussian ? "Действия" : "Actions"}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!isActive || isMain || isPending}
            onSelect={(event) => {
              event.preventDefault();
              setAsMainCharacter();
            }}
          >
            <Crown aria-hidden="true" />
            {isMain
              ? isRussian
                ? "Главный персонаж"
                : "Main character"
              : isRussian
                ? "Сделать главным"
                : "Set as main"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {result?.status === "error" ? (
          <DropdownMenuLabel className="text-destructive">
            {result.message}
          </DropdownMenuLabel>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
