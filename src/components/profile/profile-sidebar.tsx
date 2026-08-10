import React from "react";
import Link from "next/link";
import {
  CalendarBlank,
  MapPin,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { ProfileTab } from "@/components/profile/profile-page";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppLocale } from "@/lib/i18n";

type ProfileSidebarProps = {
  activeTab: ProfileTab;
  avatarUrl?: string | null;
  displayName: string;
  locale: AppLocale;
  realm?: string | null;
};

function getInitial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "R";
}

export function ProfileSidebar({
  activeTab,
  avatarUrl,
  displayName,
  locale,
  realm,
}: ProfileSidebarProps) {
  const isRussian = locale === "ru";

  return (
    <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
      <Card className="overflow-hidden shadow-none">
        <CardHeader className="items-center gap-4 border-b text-center">
          <Avatar className="size-24">
            {avatarUrl ? <AvatarImage alt={displayName} src={avatarUrl} /> : null}
            <AvatarFallback className="text-2xl">
              {getInitial(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="truncate text-lg">{displayName}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-1.5">
              <MapPin aria-hidden="true" />
              {realm ?? (isRussian ? "Сервер не указан" : "Realm unavailable")}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-1">
          <Button
            asChild
            className="justify-start"
            variant={activeTab === "events" ? "secondary" : "ghost"}
          >
            <Link
              aria-current={activeTab === "events" ? "page" : undefined}
              href="/profile"
            >
              <CalendarBlank data-icon="inline-start" aria-hidden="true" />
              {isRussian ? "События" : "Events"}
            </Link>
          </Button>
          <Button
            asChild
            className="justify-start"
            variant={activeTab === "characters" ? "secondary" : "ghost"}
          >
            <Link
              aria-current={activeTab === "characters" ? "page" : undefined}
              href="/profile?tab=characters"
            >
              <UsersThree data-icon="inline-start" aria-hidden="true" />
              {isRussian ? "Персонажи" : "Characters"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
