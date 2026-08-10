import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Crown,
  Database,
  Gem,
  LogOut,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldX,
  Swords,
  UsersRound,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  markWowCharacterCacheStaleFormAction,
  setUserAdminFormAction,
  setUserPremiumFormAction,
  type AdminCacheTarget,
} from "@/actions/admin";
import { AdminEncounterWorkspace } from "@/components/admin/admin-encounter-workspace";
import { LogoutButton } from "@/components/logout-button";
import type { AppHeaderUser } from "@/components/shell/app-header-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AdminRoleFilter = "all" | "admin" | "user";
export type AdminPremiumFilter = "all" | "premium" | "standard";
export type AdminSection = "users" | "cache" | "events" | "encounter";
export type AdminEncounterTab = "addons" | "raids" | "dungeons" | "activities";
export type AdminEncounterStatusFilter = "all" | "active" | "inactive";
export type AdminEncounterSort = "order" | "name" | "updated";

export type AdminStat = {
  detail: string;
  icon: "users" | "admins" | "premium" | "active";
  label: string;
  value: string;
};

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isAdmin: boolean;
  isPremium: boolean;
  premiumExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  accounts: Array<{
    provider: string;
    providerAccountId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  characters: Array<{
    name: string;
    realm: string;
    itemLevel: number;
    isActive: boolean;
  }>;
  _count: {
    characters: number;
    raidCheckBookmarks: number;
    scheduledEvents: number;
    sessions: number;
  };
};

export type AdminCacheRow = {
  id: string;
  name: string;
  serverSlug: string;
  serverRegion: string;
  warcraftLogsId: number | null;
  averageParse: number | null;
  bestParse: number | null;
  lastFetchedAt: Date | null;
  raiderIoScore: number | null;
  raiderIoFetchedAt: Date | null;
  blizzardEquippedItemLevel: number | null;
  blizzardEquipmentFetchedAt: Date | null;
  updatedAt: Date;
};

export type AdminEventRow = {
  id: string;
  addonSlug: string;
  activityType: "RAID" | "DUNGEON" | "SEASON" | "OPEN_WORLD";
  startsAt: Date;
  localDate: string;
  localTime: string;
  timeZone: string;
  leaderMode: "CHARACTER" | "MANUAL";
  leaderName: string;
  leaderRealm: string;
  tankMin: number;
  tankMax: number;
  healerMin: number;
  healerMax: number;
  damageMin: number;
  damageMax: number;
  hasPaidSlots: boolean;
  paidSlots: number;
  paidSlotPrice: number;
  publishTargets: Array<"DISCORD" | "TELEGRAM" | "APP" | "CUSTOM">;
  status: "PUBLISHED" | "CANCELLED";
  createdAt: Date;
  difficulty: {
    slug: string;
    labelRu: string;
    labelEn: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    accounts: Array<{
      provider: string;
      providerAccountId: string;
    }>;
  };
  activities: Array<{
    activity: {
      slug: string;
      kind: "RAID" | "DUNGEON" | "OPEN_WORLD";
      nameRu: string;
      nameEn: string;
      shortNameRu: string;
      shortNameEn: string;
      artPath: string;
    };
  }>;
};

export type AdminEncounterGroupRow = {
  id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  artPath: string | null;
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
  _count: {
    items: number;
  };
};

export type AdminEncounterDifficultyRow = {
  id: string;
  slug: string;
  labelRu: string;
  labelEn: string;
  isActive: boolean;
  sortOrder: number;
};

export type AdminEncounterActivityRow = {
  id: string;
  slug: string;
  kind: "RAID" | "DUNGEON" | "OPEN_WORLD";
  nameRu: string;
  nameEn: string;
  shortNameRu: string;
  shortNameEn: string;
  artPath: string;
  aliases: string[];
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
  groupItems: Array<{
    groupId: string;
    group: {
      id: string;
      slug: string;
      nameRu: string;
      nameEn: string;
    };
  }>;
  difficultyOptions?: Array<{
    difficultyId: string;
    sortOrder: number;
    difficulty: AdminEncounterDifficultyRow;
  }>;
};

type AdminDashboardProps = {
  cacheRows: AdminCacheRow[];
  currentUserId: string;
  encounterActivities: AdminEncounterActivityRow[];
  encounterDifficulties: AdminEncounterDifficultyRow[];
  encounterDungeons: AdminEncounterActivityRow[];
  encounterGroups: AdminEncounterGroupRow[];
  encounterRaids: AdminEncounterActivityRow[];
  encounterSort: AdminEncounterSort;
  encounterStatusFilter: AdminEncounterStatusFilter;
  encounterTab: AdminEncounterTab;
  eventRows: AdminEventRow[];
  headerUser: AppHeaderUser;
  locale: AppLocale;
  premiumFilter: AdminPremiumFilter;
  query: string;
  roleFilter: AdminRoleFilter;
  section: AdminSection;
  stats: AdminStat[];
  users: AdminUserRow[];
};

const statIcons: Record<AdminStat["icon"], LucideIcon> = {
  active: Circle,
  admins: ShieldCheck,
  premium: Gem,
  users: UsersRound,
};

const statToneClasses: Record<AdminStat["icon"], string> = {
  active: "bg-event-fel/10 text-event-fel ring-event-fel/25",
  admins: "bg-event-legendary/12 text-[#ffb45c] ring-event-legendary/28",
  premium: "bg-event-cyan/12 text-event-cyan ring-event-cyan/28",
  users: "bg-primary/14 text-[#d7b6ff] ring-primary/28",
};

const adminShellClass =
  "bg-[radial-gradient(circle_at_16%_0%,rgba(96,165,250,0.12),transparent_28rem),radial-gradient(circle_at_82%_12%,rgba(219,194,122,0.10),transparent_24rem),linear-gradient(180deg,#0b111a_0%,#080d14_52%,#060910_100%)]";
const adminSurfaceClass =
  "border-event-panel-border bg-[linear-gradient(180deg,rgba(13,30,57,0.82),rgba(5,15,31,0.96))] shadow-event-panel";
const adminFieldClass =
  "border-event-panel-border bg-[rgba(3,13,27,0.62)] text-event-copy-strong placeholder:text-event-copy/55 focus-visible:border-event-cyan/60 focus-visible:ring-event-cyan/30";
const adminMutedSurfaceClass =
  "border-event-panel-border bg-event-panel-surface-soft text-event-copy-strong";

const cacheTargets: Array<{
  label: string;
  value: AdminCacheTarget;
}> = [
  { label: "WCL", value: "warcraftLogs" },
  { label: "Raider.IO", value: "raiderIo" },
  { label: "Gear", value: "blizzardEquipment" },
  { label: "All", value: "all" },
];

const encounterFallbackArt = "/home/raid-reminder-mark.png";

const adminNavItems: Array<{
  href: string;
  icon: LucideIcon;
  label: string;
  section: AdminSection;
}> = [
  {
    href: "/dashboard",
    icon: UsersRound,
    label: "Пользователи",
    section: "users",
  },
  {
    href: "/dashboard?section=cache",
    icon: Database,
    label: "Кеш",
    section: "cache",
  },
  {
    href: "/dashboard?section=events",
    icon: CalendarDays,
    label: "Эвенты",
    section: "events",
  },
  {
    href: "/dashboard?section=encounter",
    icon: Swords,
    label: "Энкаунтер",
    section: "encounter",
  },
];

function formatDate(value: Date | null, locale: AppLocale) {
  if (!value) {
    return locale === "ru" ? "никогда" : "never";
  }

  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatNumber(value: number | null) {
  return value === null ? "-" : String(Math.round(value * 10) / 10);
}

function formatDateOnly(value: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function isStaleCacheDate(value: Date | null) {
  if (!value) {
    return true;
  }

  const ageMs = Date.now() - value.getTime();

  return value.getTime() <= 1000 || ageMs >= 24 * 60 * 60 * 1000;
}

function getUserLabel(user: AdminUserRow) {
  return user.name ?? user.email ?? user.id;
}

function getBattleNetLabel(user: AdminUserRow) {
  const battleNetAccount = user.accounts.find(
    (account) => account.provider === "battlenet",
  );

  return (
    battleNetAccount?.providerAccountId ??
    user.accounts[0]?.providerAccountId ??
    user.id
  );
}

function getEventUserLabel(user: AdminEventRow["user"]) {
  return user.name ?? user.email ?? user.accounts[0]?.providerAccountId ?? user.id;
}

function getLocalizedName(
  locale: AppLocale,
  value: { nameEn: string; nameRu: string },
) {
  return locale === "ru" ? value.nameRu : value.nameEn;
}

function getLocalizedDifficulty(
  locale: AppLocale,
  value: { labelEn: string; labelRu: string },
) {
  return locale === "ru" ? value.labelRu : value.labelEn;
}

function formatActivityType(type: AdminEventRow["activityType"]) {
  if (type === "RAID") {
    return "Рейд";
  }

  if (type === "DUNGEON") {
    return "Данж";
  }

  if (type === "SEASON") {
    return "Сезон";
  }

  return "Активность";
}

function formatRoles(event: AdminEventRow) {
  return [
    `T ${event.tankMin}-${event.tankMax}`,
    `H ${event.healerMin}-${event.healerMax}`,
    `D ${event.damageMin}-${event.damageMax}`,
  ].join(" · ");
}

function formatPaidSlots(event: AdminEventRow) {
  if (!event.hasPaidSlots) {
    return "без платных слотов";
  }

  return `${event.paidSlots} × ${new Intl.NumberFormat("ru-RU").format(
    event.paidSlotPrice,
  )}`;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isPremiumActive(user: AdminUserRow, now = new Date()) {
  return (
    user.isPremium &&
    (!user.premiumExpiresAt || user.premiumExpiresAt.getTime() > now.getTime())
  );
}

function isPremiumExpired(user: AdminUserRow, now = new Date()) {
  return Boolean(
    user.isPremium &&
      user.premiumExpiresAt &&
      user.premiumExpiresAt.getTime() <= now.getTime(),
  );
}

function getPremiumExpiryLabel(user: AdminUserRow, locale: AppLocale) {
  if (!user.isPremium) {
    return "не активен";
  }

  if (!user.premiumExpiresAt) {
    return "бессрочно";
  }

  return `до ${formatDateOnly(user.premiumExpiresAt, locale)}`;
}

function StatusBadge({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Badge
      className={cn(
        "gap-1 border",
        active
          ? "border-event-fel/40 bg-event-fel/10 text-[#eaffd1]"
          : adminMutedSurfaceClass,
      )}
      variant="outline"
    >
      {active ? (
        <CheckCircle2 className="size-3" aria-hidden="true" />
      ) : (
        <XCircle className="size-3" aria-hidden="true" />
      )}
      {children}
    </Badge>
  );
}

function RoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Badge
      className={cn(
        "border",
        isAdmin
          ? "border-primary/45 bg-primary/16 text-[#e8ddff]"
          : adminMutedSurfaceClass,
      )}
      variant="outline"
    >
      {isAdmin ? "Admin" : "User"}
    </Badge>
  );
}

function PremiumBadge({
  locale,
  user,
}: {
  locale: AppLocale;
  user: AdminUserRow;
}) {
  const active = isPremiumActive(user);
  const expired = isPremiumExpired(user);

  return (
    <div className="grid gap-1">
      <Badge
        className={cn(
          "w-fit gap-1 border",
          active && "border-event-cyan/45 bg-event-cyan/12 text-event-cyan",
          expired &&
            "border-event-legendary/45 bg-event-legendary/12 text-[#ffb45c]",
          !active &&
            !expired &&
            adminMutedSurfaceClass,
        )}
        variant="outline"
      >
        {active || expired ? (
          <Crown className="size-3" aria-hidden="true" />
        ) : null}
        {active ? "Premium" : expired ? "Истек" : "Standard"}
      </Badge>
      <span className="text-xs text-event-copy">
        {getPremiumExpiryLabel(user, locale)}
      </span>
    </div>
  );
}

function UserAvatar({ user }: { user: AdminUserRow }) {
  const label = getUserLabel(user);

  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/35 bg-primary/14 text-xs font-semibold text-[#d7b6ff]">
      {user.image ? (
        <Image
          alt=""
          className="size-full object-cover"
          height={40}
          src={user.image}
          unoptimized
          width={40}
        />
      ) : (
        getInitials(label) || "RR"
      )}
    </span>
  );
}

function UserAdminToggleForm({
  currentUserId,
  user,
}: {
  currentUserId: string;
  user: AdminUserRow;
}) {
  const nextIsAdmin = !user.isAdmin;
  const disablesSelfDemotion = user.id === currentUserId && user.isAdmin;

  return (
    <form action={setUserAdminFormAction}>
      <input name="userId" type="hidden" value={user.id} />
      <input name="isAdmin" type="hidden" value={String(nextIsAdmin)} />
      <DropdownMenuItem asChild disabled={disablesSelfDemotion}>
        <button disabled={disablesSelfDemotion} type="submit">
          {user.isAdmin ? (
            <ShieldX className="size-4" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-4" aria-hidden="true" />
          )}
          {user.isAdmin ? "Снять admin" : "Назначить admin"}
        </button>
      </DropdownMenuItem>
    </form>
  );
}

function UserPremiumActionForm({
  children,
  durationDays,
  isPremium,
  user,
}: {
  children: ReactNode;
  durationDays?: number | "permanent";
  isPremium: boolean;
  user: AdminUserRow;
}) {
  const durationValue =
    typeof durationDays === "number" ? String(durationDays) : durationDays;

  return (
    <form action={setUserPremiumFormAction}>
      <input name="userId" type="hidden" value={user.id} />
      <input name="isPremium" type="hidden" value={String(isPremium)} />
      {durationValue ? (
        <input name="premiumDurationDays" type="hidden" value={durationValue} />
      ) : null}
      <DropdownMenuItem asChild>
        <button type="submit">
          <Crown className="size-4" aria-hidden="true" />
          {children}
        </button>
      </DropdownMenuItem>
    </form>
  );
}

function UserPremiumActions({ user }: { user: AdminUserRow }) {
  return (
    <>
      <UserPremiumActionForm durationDays={30} isPremium user={user}>
        Premium на 30 дней
      </UserPremiumActionForm>
      <UserPremiumActionForm durationDays={90} isPremium user={user}>
        Premium на 90 дней
      </UserPremiumActionForm>
      <UserPremiumActionForm durationDays={365} isPremium user={user}>
        Premium на 365 дней
      </UserPremiumActionForm>
      <UserPremiumActionForm durationDays="permanent" isPremium user={user}>
        Premium бессрочно
      </UserPremiumActionForm>
      {user.isPremium ? (
        <>
          <DropdownMenuSeparator />
          <UserPremiumActionForm isPremium={false} user={user}>
            Снять Premium
          </UserPremiumActionForm>
        </>
      ) : null}
    </>
  );
}

function UserActionsMenu({
  currentUserId,
  user,
}: {
  currentUserId: string;
  user: AdminUserRow;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Действия для ${getUserLabel(user)}`}
          className={cn("size-9 rounded-md", adminFieldClass)}
          size="icon"
          variant="outline"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>Действия</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <UserAdminToggleForm currentUserId={currentUserId} user={user} />
        <DropdownMenuSeparator />
        <UserPremiumActions user={user} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CacheStaleForm({
  characterId,
  target,
}: {
  characterId: string;
  target: AdminCacheTarget;
}) {
  return (
    <form action={markWowCharacterCacheStaleFormAction}>
      <input name="characterId" type="hidden" value={characterId} />
      <input name="cacheTarget" type="hidden" value={target} />
      <Button size="sm" type="submit" variant="outline">
        <RotateCcw className="size-4" aria-hidden="true" />
        {cacheTargets.find((item) => item.value === target)?.label ?? target}
      </Button>
    </form>
  );
}

function AdminSidebar({
  section,
  user,
}: {
  section: AdminSection;
  user: AppHeaderUser;
}) {
  const displayName = user.displayName ?? "Артанас";

  return (
    <Sidebar className="border-event-panel-border bg-popover" collapsible="icon">
      <SidebarHeader className="border-b border-event-panel-border p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2">
          <Link
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 group-data-[collapsible=icon]:hidden"
            href="/dashboard"
          >
            <span className="flex size-12 items-center justify-center overflow-hidden rounded-full border border-event-cyan/35 bg-secondary shadow-[0_0_18px_rgba(110,219,255,0.12)]">
              <Image
                alt=""
                className="size-full object-cover"
                height={48}
                src="/home/raid-reminder-mark.png"
                width={48}
              />
            </span>
            <span className="truncate text-lg font-semibold text-event-copy-strong group-data-[collapsible=icon]:hidden">
              RaidReminder
            </span>
          </Link>
          <SidebarTrigger
            className={cn(
              "shrink-0 group-data-[collapsible=icon]:mx-auto",
              adminFieldClass,
            )}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 group-data-[collapsible=icon]:p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-event-copy/75 group-data-[collapsible=icon]:sr-only">
            Администрирование
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.section === section;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      className="min-h-11 text-event-copy hover:bg-secondary hover:text-event-copy-strong data-[active=true]:border data-[active=true]:border-primary/45 data-[active=true]:bg-primary/16 data-[active=true]:text-[#e8ddff] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&_svg]:text-current"
                      isActive={isActive}
                    >
                      <Link href={item.href}>
                        <Icon className="size-5" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-event-panel-border p-4 group-data-[collapsible=icon]:p-2">
        <div className="rounded-md border border-event-panel-border bg-event-panel-surface-soft p-3 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-event-cyan/30 bg-event-cyan/10 text-sm font-semibold text-event-cyan group-data-[collapsible=icon]:size-8">
              {user.avatarUrl ? (
                <Image
                  alt=""
                  className="size-full object-cover"
                  height={44}
                  src={user.avatarUrl}
                  unoptimized
                  width={44}
                />
              ) : (
                getInitials(displayName) || "RR"
              )}
            </span>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-medium text-event-copy-strong">
                {displayName}
              </div>
              <div className="text-xs text-event-copy">Администратор</div>
            </div>
            <LogoutButton
              aria-label="Выйти"
              className={cn(
                "size-9 shrink-0 rounded-md p-0 group-data-[collapsible=icon]:hidden",
                adminFieldClass,
              )}
              size="icon"
              variant="outline"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </LogoutButton>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function StatsGrid({ stats }: { stats: AdminStat[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = statIcons[stat.icon];

        return (
          <Card
            className={cn("rounded-lg", adminSurfaceClass)}
            key={stat.label}
          >
            <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-5">
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-md ring-1",
                  statToneClasses[stat.icon],
                )}
              >
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate text-sm text-event-copy">
                  {stat.label}
                </p>
                <strong className="mt-1 block text-2xl text-event-copy-strong">
                  {stat.value}
                </strong>
                <span className="mt-1 block truncate text-xs text-event-copy">
                  {stat.detail}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function UsersTable({
  currentUserId,
  users,
  locale,
}: {
  currentUserId: string;
  locale: AppLocale;
  users: AdminUserRow[];
}) {
  return (
    <ScrollArea className="h-[586px]" scrollbarOrientation="both">
      <Table className="min-w-[1120px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Battle.net ID</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Premium</TableHead>
            <TableHead>Эвентов создано</TableHead>
            <TableHead>Дата регистрации</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-event-copy-strong">
                      {getBattleNetLabel(user)}
                    </div>
                    <div className="mt-1 truncate text-xs text-event-copy">
                      {getUserLabel(user)}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <RoleBadge isAdmin={user.isAdmin} />
              </TableCell>
              <TableCell>
                <PremiumBadge locale={locale} user={user} />
              </TableCell>
              <TableCell>
                <div className="font-medium text-event-copy-strong">
                  {user._count.scheduledEvents}
                </div>
                <div className="mt-1 text-xs text-event-copy">
                  {user._count.characters} персонажей ·{" "}
                  {user._count.raidCheckBookmarks} закладок
                </div>
              </TableCell>
              <TableCell className="text-event-copy-strong">
                {formatDate(user.createdAt, locale)}
              </TableCell>
              <TableCell className="text-right">
                <UserActionsMenu currentUserId={currentUserId} user={user} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function Filters({
  premiumFilter,
  query,
  roleFilter,
}: {
  premiumFilter: AdminPremiumFilter;
  query: string;
  roleFilter: AdminRoleFilter;
}) {
  const hasFilters =
    query.length > 0 || roleFilter !== "all" || premiumFilter !== "all";

  return (
    <form
      className="grid gap-3 border-b border-event-panel-border p-4 lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto]"
      method="get"
    >
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-event-copy"
          aria-hidden="true"
        />
        <Input
          aria-label="Поиск"
          className={cn("h-10 pl-9", adminFieldClass)}
          defaultValue={query}
          name="q"
          placeholder="Поиск по Battle.net ID..."
        />
      </div>

      <Select defaultValue={roleFilter} name="role">
        <SelectTrigger className={cn("h-10", adminFieldClass)}>
          <SelectValue placeholder="Все роли" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все роли</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue={premiumFilter} name="premium">
        <SelectTrigger className={cn("h-10", adminFieldClass)}>
          <SelectValue placeholder="Premium: все" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Premium: все</SelectItem>
          <SelectItem value="premium">Premium</SelectItem>
          <SelectItem value="standard">Standard</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button className="min-w-24" type="submit" variant="secondary">
          Найти
        </Button>
        {hasFilters ? (
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <RotateCcw className="size-4" aria-hidden="true" />
              Сбросить
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function CacheFilters({ query }: { query: string }) {
  return (
    <form
      className="grid gap-3 border-b border-event-panel-border p-4 lg:grid-cols-[minmax(240px,1fr)_auto]"
      method="get"
    >
      <input name="section" type="hidden" value="cache" />
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-event-copy"
          aria-hidden="true"
        />
        <Input
          aria-label="Поиск по кешу"
          className={cn("h-10 pl-9", adminFieldClass)}
          defaultValue={query}
          name="q"
          placeholder="Поиск по персонажу, realm или региону..."
        />
      </div>
      <div className="flex gap-2">
        <Button className="min-w-24" type="submit" variant="secondary">
          Найти
        </Button>
        {query ? (
          <Button asChild variant="outline">
            <Link href="/dashboard?section=cache">
              <RotateCcw className="size-4" aria-hidden="true" />
              Сбросить
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function SecondarySection({
  children,
  copy,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  copy: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Card className={cn("rounded-lg", adminSurfaceClass)}>
      <CardHeader className="grid gap-1 border-b border-event-panel-border p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md border border-event-cyan/30 bg-event-cyan/10 text-event-cyan">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <CardTitle className="text-lg text-event-copy-strong">
            {title}
          </CardTitle>
        </div>
        <p className="m-0 text-sm text-event-copy">{copy}</p>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function CacheTable({
  cacheRows,
  locale,
}: {
  cacheRows: AdminCacheRow[];
  locale: AppLocale;
}) {
  return (
    <ScrollArea className="h-[440px]" scrollbarOrientation="both">
      <Table className="min-w-[1120px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Персонаж</TableHead>
            <TableHead>WCL</TableHead>
            <TableHead>Raider.IO</TableHead>
            <TableHead>Blizzard gear</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Mark stale</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cacheRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium text-event-copy-strong">
                  {row.name}-{row.serverSlug}
                </div>
                <div className="mt-1 text-xs uppercase text-event-copy">
                  {row.serverRegion}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge active={!isStaleCacheDate(row.lastFetchedAt)}>
                  {isStaleCacheDate(row.lastFetchedAt) ? "stale" : "fresh"}
                </StatusBadge>
                <div className="mt-2 text-xs text-event-copy">
                  {formatDate(row.lastFetchedAt, locale)}
                </div>
                <div className="mt-1 text-xs text-event-copy-strong">
                  avg {formatNumber(row.averageParse)} / best{" "}
                  {formatNumber(row.bestParse)}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge active={!isStaleCacheDate(row.raiderIoFetchedAt)}>
                  {isStaleCacheDate(row.raiderIoFetchedAt) ? "stale" : "fresh"}
                </StatusBadge>
                <div className="mt-2 text-xs text-event-copy">
                  {formatDate(row.raiderIoFetchedAt, locale)}
                </div>
                <div className="mt-1 text-xs text-event-copy-strong">
                  score {formatNumber(row.raiderIoScore)}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  active={!isStaleCacheDate(row.blizzardEquipmentFetchedAt)}
                >
                  {isStaleCacheDate(row.blizzardEquipmentFetchedAt)
                    ? "stale"
                    : "fresh"}
                </StatusBadge>
                <div className="mt-2 text-xs text-event-copy">
                  {formatDate(row.blizzardEquipmentFetchedAt, locale)}
                </div>
                <div className="mt-1 text-xs text-event-copy-strong">
                  ilvl {formatNumber(row.blizzardEquippedItemLevel)}
                </div>
              </TableCell>
              <TableCell className="text-event-copy-strong">
                {formatDate(row.updatedAt, locale)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {cacheTargets.map((target) => (
                    <CacheStaleForm
                      characterId={row.id}
                      key={target.value}
                      target={target.value}
                    />
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function SectionSearchFilters({
  placeholder,
  query,
  section,
}: {
  placeholder: string;
  query: string;
  section: AdminSection;
}) {
  return (
    <form
      className="grid gap-3 border-b border-event-panel-border p-4 lg:grid-cols-[minmax(240px,1fr)_auto]"
      method="get"
    >
      <input name="section" type="hidden" value={section} />
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-event-copy"
          aria-hidden="true"
        />
        <Input
          aria-label="Поиск"
          className={cn("h-10 pl-9", adminFieldClass)}
          defaultValue={query}
          name="q"
          placeholder={placeholder}
        />
      </div>
      <div className="flex gap-2">
        <Button className="min-w-24" type="submit" variant="secondary">
          Найти
        </Button>
        {query ? (
          <Button asChild variant="outline">
            <Link href={`/dashboard?section=${section}`}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Сбросить
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function EventsTable({
  eventRows,
  locale,
}: {
  eventRows: AdminEventRow[];
  locale: AppLocale;
}) {
  return (
    <ScrollArea className="h-[586px]" scrollbarOrientation="both">
      <Table className="min-w-[1180px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Событие</TableHead>
            <TableHead>Лидер</TableHead>
            <TableHead>Создатель</TableHead>
            <TableHead>Состав</TableHead>
            <TableHead>Публикация</TableHead>
            <TableHead>Дата</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventRows.map((event) => {
            const primaryActivity = event.activities[0]?.activity;
            const activityNames = event.activities
              .map((item) => getLocalizedName(locale, item.activity))
              .join(", ");

            return (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="relative flex h-12 w-20 shrink-0 overflow-hidden rounded-md border border-event-panel-border bg-popover">
                      <Image
                        alt=""
                        className="object-cover"
                        fill
                        sizes="80px"
                        src={primaryActivity?.artPath || encounterFallbackArt}
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-event-copy-strong">
                        {activityNames || event.addonSlug}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-event-copy">
                        <span>{formatActivityType(event.activityType)}</span>
                        <span>{event.addonSlug}</span>
                        <span>{getLocalizedDifficulty(locale, event.difficulty)}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-event-copy-strong">
                    {event.leaderName}
                  </div>
                  <div className="mt-1 text-xs text-event-copy">
                    {event.leaderRealm} ·{" "}
                    {event.leaderMode === "CHARACTER" ? "персонаж" : "вручную"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-event-copy-strong">
                    {getEventUserLabel(event.user)}
                  </div>
                  <div className="mt-1 text-xs text-event-copy">
                    {event.user.accounts[0]?.providerAccountId ?? event.user.id}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-event-copy-strong">
                    {formatRoles(event)}
                  </div>
                  <div className="mt-1 text-xs text-event-copy">
                    {formatPaidSlots(event)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {event.publishTargets.map((target) => (
                      <Badge
                        className={adminMutedSurfaceClass}
                        key={target}
                        variant="outline"
                      >
                        {target}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2">
                    <StatusBadge active={event.status === "PUBLISHED"}>
                      {event.status}
                    </StatusBadge>
                  </div>
                </TableCell>
                <TableCell className="text-event-copy-strong">
                  {formatDate(event.startsAt, locale)}
                  <div className="mt-1 text-xs text-event-copy">
                    {event.localDate} {event.localTime} · {event.timeZone}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export function AdminDashboard({
  cacheRows,
  currentUserId,
  encounterActivities,
  encounterDifficulties,
  encounterDungeons,
  encounterGroups,
  encounterRaids,
  encounterSort,
  encounterStatusFilter,
  encounterTab,
  eventRows,
  headerUser,
  locale,
  premiumFilter,
  query,
  roleFilter,
  section,
  stats,
  users,
}: AdminDashboardProps) {
  const sectionMeta: Record<AdminSection, { copy: string; title: string }> = {
    cache: {
      copy: "Управление timestamp кеша WowCharacter для WCL, Raider.IO и Blizzard gear.",
      title: "Кеш",
    },
    encounter: {
      copy: "",
      title: "Энкаунтер",
    },
    events: {
      copy: "Все опубликованные ScheduledEvent с лидерами, составом, сложностями и каналами публикации.",
      title: "Эвенты",
    },
    users: {
      copy: "Battle.net аккаунты, роли админов, premium-флаги и операционные таблицы без опасных удалений.",
      title: "Пользователи",
    },
  };
  const { copy, title } = sectionMeta[section];

  return (
    <SidebarProvider className={cn("min-h-screen text-foreground", adminShellClass)}>
      <AdminSidebar section={section} user={headerUser} />

      <SidebarInset className="min-w-0 bg-transparent">
        <div className="mx-auto grid w-full max-w-[1560px] gap-5 px-4 py-5 lg:px-6">
          {section !== "encounter" ? (
            <header className="flex min-h-20 items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="m-0 text-3xl font-semibold text-event-copy-strong md:text-4xl">
                  {title}
                </h1>
                {copy ? (
                  <p className="mt-2 max-w-2xl text-sm text-event-copy">{copy}</p>
                ) : null}
              </div>
            </header>
          ) : null}

          {section === "users" ? (
            <>
              <StatsGrid stats={stats} />

              <Card className={cn("overflow-hidden rounded-lg", adminSurfaceClass)}>
                <Filters
                  premiumFilter={premiumFilter}
                  query={query}
                  roleFilter={roleFilter}
                />
                <CardContent className="p-0">
                  <UsersTable
                    currentUserId={currentUserId}
                    locale={locale}
                    users={users}
                  />
                </CardContent>
              </Card>
            </>
          ) : null}

          {section === "cache" ? (
            <SecondarySection
              copy="Кнопки не удаляют JSON: они только делают timestamp устаревшим для следующего обычного refresh."
              icon={Database}
              title="WowCharacter cache"
            >
              <CacheFilters query={query} />
              <CacheTable cacheRows={cacheRows} locale={locale} />
            </SecondarySection>
          ) : null}

          {section === "events" ? (
            <Card className={cn("overflow-hidden rounded-lg", adminSurfaceClass)}>
              <SectionSearchFilters
                placeholder="Поиск по лидеру, Battle.net, аддону или активности..."
                query={query}
                section="events"
              />
              <CardContent className="p-0">
                <EventsTable eventRows={eventRows} locale={locale} />
              </CardContent>
            </Card>
          ) : null}

          {section === "encounter" ? (
            <AdminEncounterWorkspace
              activities={encounterActivities}
              activeTab={encounterTab}
              difficulties={encounterDifficulties}
              dungeons={encounterDungeons}
              groups={encounterGroups}
              locale={locale}
              query={query}
              raids={encounterRaids}
              sort={encounterSort}
              statusFilter={encounterStatusFilter}
            />
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
