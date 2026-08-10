import React from "react";
import type { Character } from "@prisma/client";
import { AppHeader } from "@/components/shell/app-header";
import { ProfileCharacters } from "@/components/profile/profile-characters";
import {
  ProfileEvents,
  type ProfileScheduledEvent,
} from "@/components/profile/profile-events";
import { ProfileSidebar } from "@/components/profile/profile-sidebar";
import type { AppLocale } from "@/lib/i18n";

export type ProfileTab = "events" | "characters";

type ProfilePageViewProps = {
  activeTab: ProfileTab;
  characters: Character[];
  displayName: string;
  fallbackAvatarUrl?: string | null;
  isAdmin?: boolean;
  locale: AppLocale;
  mainCharacter: Character | null;
  mainCharacterId?: string | null;
  now: Date;
  scheduledEvents: ProfileScheduledEvent[];
};

export function ProfilePageView({
  activeTab,
  characters,
  displayName,
  fallbackAvatarUrl,
  isAdmin = false,
  locale,
  mainCharacter,
  mainCharacterId,
  now,
  scheduledEvents,
}: ProfilePageViewProps) {
  const avatarUrl =
    mainCharacter?.avatarUrl ??
    mainCharacter?.thumbnailUrl ??
    fallbackAvatarUrl ??
    null;
  const profileName = mainCharacter?.name ?? displayName;

  return (
    <main className="min-h-full" id="top">
      <AppHeader
        user={{ avatarUrl, displayName: profileName, isAdmin }}
      />

      <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-6 lg:py-10">
        <ProfileSidebar
          activeTab={activeTab}
          avatarUrl={avatarUrl}
          displayName={profileName}
          locale={locale}
          realm={mainCharacter?.realm ?? null}
        />

        <div className="min-w-0">
          {activeTab === "characters" ? (
            <ProfileCharacters
              characters={characters}
              locale={locale}
              mainCharacterId={mainCharacterId}
            />
          ) : (
            <ProfileEvents events={scheduledEvents} locale={locale} now={now} />
          )}
        </div>
      </div>
    </main>
  );
}
