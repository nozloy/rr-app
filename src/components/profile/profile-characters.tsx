import React from "react";
import type { Character } from "@prisma/client";
import {
  Crown,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { ProfileCharacterActions } from "@/components/profile/profile-character-actions";
import { ProfileSyncControl } from "@/components/profile/profile-sync-control";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppLocale } from "@/lib/i18n";
import { formatItemLevel } from "@/lib/utils";

type ProfileCharactersProps = {
  characters: Character[];
  locale: AppLocale;
  mainCharacterId?: string | null;
};

function getCharacterImage(character: Character) {
  return character.avatarUrl ?? character.thumbnailUrl ?? null;
}

function CharacterRow({
  character,
  locale,
  mainCharacterId,
}: {
  character: Character;
  locale: AppLocale;
  mainCharacterId?: string | null;
}) {
  const isMain = character.id === mainCharacterId;
  const isRussian = locale === "ru";
  const avatarUrl = getCharacterImage(character);

  return (
    <Card className="shadow-none" data-active={character.isActive}>
      <CardHeader className="gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-12">
            {avatarUrl ? <AvatarImage alt={character.name} src={avatarUrl} /> : null}
            <AvatarFallback>{character.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base">{character.name}</CardTitle>
              {isMain ? (
                <Badge variant="secondary">
                  <Crown aria-hidden="true" />
                  {isRussian ? "Главный" : "Main"}
                </Badge>
              ) : null}
              <Badge variant={character.isActive ? "success" : "outline"}>
                {character.isActive
                  ? isRussian
                    ? "Активен"
                    : "Active"
                  : isRussian
                    ? "Неактивен"
                    : "Inactive"}
              </Badge>
            </div>
            <CardDescription>{character.realm}</CardDescription>
          </div>
        </div>

        <ProfileCharacterActions
          characterId={character.id}
          isActive={character.isActive}
          isMain={isMain}
          locale={locale}
        />
      </CardHeader>
      <CardContent className="grid gap-3 px-4 pb-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {isRussian ? "Класс и специализация" : "Class and specialization"}
          </span>
          <strong>
            {character.className} · {character.activeSpec ?? (isRussian ? "Не указана" : "Unknown")}
          </strong>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {isRussian ? "Уровень" : "Level"}
          </span>
          <strong>{character.level}</strong>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Item level</span>
          <strong>{formatItemLevel(character.itemLevel)}</strong>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {isRussian ? "Фракция" : "Faction"}
          </span>
          <strong>{character.factionName}</strong>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileCharacters({
  characters,
  locale,
  mainCharacterId,
}: ProfileCharactersProps) {
  const isRussian = locale === "ru";

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>{isRussian ? "Персонажи" : "Characters"}</CardTitle>
          <CardDescription>
            {isRussian
              ? "Все персонажи синхронизированного аккаунта Battle.net."
              : "All characters from your synchronized Battle.net account."}
          </CardDescription>
        </div>
        <ProfileSyncControl locale={locale} />
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {characters.length === 0 ? (
          <Empty className="min-h-[28rem] border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersThree aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {isRussian ? "Персонажи не найдены" : "No characters found"}
              </EmptyTitle>
              <EmptyDescription>
                {isRussian
                  ? "Запустите синхронизацию Battle.net, чтобы загрузить персонажей."
                  : "Run Battle.net sync to load your characters."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="h-[min(68vh,48rem)] pr-3 max-lg:h-auto max-lg:pr-0">
            <div className="flex flex-col gap-3">
              {characters.map((character) => (
                <CharacterRow
                  character={character}
                  key={character.id}
                  locale={locale}
                  mainCharacterId={mainCharacterId}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
