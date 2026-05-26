import Image from "next/image";
import Link from "next/link";
import type { Character } from "@prisma/client";
import { ChevronRight, LogOut, ShieldAlert } from "lucide-react";
import { dashboardActions, dashboardSidebarStats } from "@/components/dashboard/data";
import { DashboardSyncCard } from "@/components/dashboard/dashboard-sync-card";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { formatItemLevel } from "@/lib/utils";

type DashboardSidebarProps = {
  activeCount: number;
  characters: Character[];
  displayName: string;
  topCharacter?: Character | null;
};

function getCharacterImage(character?: Character | null) {
  return character?.avatarUrl ?? character?.thumbnailUrl ?? null;
}

function getInitials(value: string) {
  return value.slice(0, 1).toUpperCase();
}

export function DashboardSidebar({
  activeCount,
  characters,
  displayName,
  topCharacter,
}: DashboardSidebarProps) {
  const profileImage = getCharacterImage(topCharacter);
  const profileName = topCharacter?.name ?? displayName;

  return (
    <aside className="dashboard-sidebar">
      <section className="dashboard-profile-card">
        <div className="dashboard-profile-avatar">
          {profileImage ? (
            <Image
              src={profileImage}
              alt=""
              width={112}
              height={112}
              unoptimized
            />
          ) : (
            <span>{getInitials(profileName)}</span>
          )}
        </div>

        <div className="dashboard-profile-badge">
          <span>Battle.net</span>
          <strong>Подключен</strong>
        </div>

        <div className="dashboard-profile-faction" aria-hidden="true">
          <ShieldAlert className="size-6" />
        </div>

        <h2>{profileName}</h2>
        <p>
          Регион: Европа
          <br />
          {topCharacter
            ? `Realm: ${topCharacter.realm}`
            : `Активных персонажей: ${activeCount}`}
        </p>

        <div className="dashboard-sidebar-stats">
          {dashboardSidebarStats.map((stat) => {
            const Icon = stat.icon;
            const value = stat.value === "auto" ? characters.length : stat.value;

            return (
              <button className="dashboard-sidebar-stat" data-tone={stat.tone} key={stat.label} type="button">
                <Icon className="size-6" aria-hidden="true" />
                <span>
                  <small>{stat.label}</small>
                  <strong>{value}</strong>
                </span>
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="dashboard-sidebar-actions">
          {dashboardActions.map((action) => {
            const Icon = action.icon;
            const content = (
              <>
                <Icon className="size-5" aria-hidden="true" />
                {action.label}
              </>
            );

            return action.href ? (
              <Button
                asChild
                className="dashboard-sidebar-action"
                data-variant={action.variant}
                key={action.label}
                variant={action.variant === "primary" ? "default" : "outline"}
              >
                <Link href={action.href}>{content}</Link>
              </Button>
            ) : (
              <Button
                className="dashboard-sidebar-action"
                data-variant={action.variant}
                key={action.label}
                type="button"
                variant={action.variant === "primary" ? "default" : "outline"}
              >
                {content}
              </Button>
            );
          })}
        </div>

        <DashboardSyncCard />

        <div className="dashboard-sidebar-footer">
          <span>
            Топ ilvl:{" "}
            <strong>{topCharacter ? formatItemLevel(topCharacter.itemLevel) : "н/д"}</strong>
          </span>
          <LogoutButton className="dashboard-logout-button" size="sm">
            <LogOut className="size-4" aria-hidden="true" />
            Выйти
          </LogoutButton>
        </div>
      </section>
    </aside>
  );
}
