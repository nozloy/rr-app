"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
  Boxes,
  CheckCircle2,
  DoorOpen,
  ImageIcon,
  Layers,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Swords,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  saveActivityGroupFormAction,
  saveActivitySheetFormAction,
} from "@/actions/admin";
import { EncounterAddonCombobox } from "@/components/admin/encounter-addon-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminEncounterActivityRow,
  AdminEncounterDifficultyRow,
  AdminEncounterGroupRow,
  AdminEncounterSort,
  AdminEncounterStatusFilter,
  AdminEncounterTab,
} from "@/components/admin/admin-dashboard";
import type { AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type EncounterSheetState =
  | {
      item: AdminEncounterActivityRow | null;
      tab: Exclude<AdminEncounterTab, "addons">;
      type: "activity";
    }
  | {
      item: AdminEncounterGroupRow | null;
      tab: "addons";
      type: "group";
    };

type AdminEncounterWorkspaceProps = {
  activities: AdminEncounterActivityRow[];
  activeTab: AdminEncounterTab;
  difficulties: AdminEncounterDifficultyRow[];
  dungeons: AdminEncounterActivityRow[];
  groups: AdminEncounterGroupRow[];
  locale: AppLocale;
  query: string;
  raids: AdminEncounterActivityRow[];
  sort: AdminEncounterSort;
  statusFilter: AdminEncounterStatusFilter;
};

const fallbackArt = "/home/raid-reminder-mark.png";
const adminSurfaceClass =
  "border-event-panel-border bg-[linear-gradient(180deg,rgba(13,30,57,0.82),rgba(5,15,31,0.96))] shadow-event-panel";
const adminFieldClass =
  "border-event-panel-border bg-[rgba(3,13,27,0.62)] text-event-copy-strong placeholder:text-event-copy/55 focus-visible:border-event-cyan/60 focus-visible:ring-event-cyan/30";
const adminMutedSurfaceClass =
  "border-event-panel-border bg-event-panel-surface-soft text-event-copy-strong";
const standardDifficultySlugs = new Set(["normal", "heroic", "mythic"]);

const encounterTabs: Array<{
  icon: LucideIcon;
  label: string;
  value: AdminEncounterTab;
}> = [
  { icon: Layers, label: "Дополнения", value: "addons" },
  { icon: Swords, label: "Рейды", value: "raids" },
  { icon: DoorOpen, label: "Данжи", value: "dungeons" },
  { icon: Boxes, label: "Активности", value: "activities" },
];

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

function formatDate(value: Date | string, locale: AppLocale) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getActivityKindForTab(tab: Exclude<AdminEncounterTab, "addons">) {
  if (tab === "raids") {
    return "RAID" as const;
  }

  if (tab === "dungeons") {
    return "DUNGEON" as const;
  }

  return "OPEN_WORLD" as const;
}

function getActivityTypeLabel(kind: AdminEncounterActivityRow["kind"]) {
  if (kind === "RAID") {
    return "Рейд";
  }

  if (kind === "DUNGEON") {
    return "Данж";
  }

  return "Активность";
}

function getRows({
  activeTab,
  activities,
  dungeons,
  groups,
  raids,
}: Pick<
  AdminEncounterWorkspaceProps,
  "activeTab" | "activities" | "dungeons" | "groups" | "raids"
>) {
  if (activeTab === "addons") {
    return groups;
  }

  if (activeTab === "raids") {
    return raids;
  }

  if (activeTab === "dungeons") {
    return dungeons;
  }

  return activities;
}

function getGroupNames(
  locale: AppLocale,
  groups: AdminEncounterActivityRow["groupItems"],
) {
  return groups.map((item) => getLocalizedName(locale, item.group)).join(", ");
}

function getDifficultyNames(
  locale: AppLocale,
  activity: AdminEncounterActivityRow,
) {
  return (
    activity.difficultyOptions
      ?.map((item) => getLocalizedDifficulty(locale, item.difficulty))
      .join(", ") ?? ""
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={cn(
        "gap-1 border",
        active
          ? "border-event-fel/45 bg-event-fel/10 text-[#eaffd1]"
          : adminMutedSurfaceClass,
      )}
      variant="outline"
    >
      {active ? <CheckCircle2 className="size-3" aria-hidden="true" /> : null}
      {active ? "Активно" : "Скрыто"}
    </Badge>
  );
}

function buildEncounterHref(params: Record<string, string | null | undefined>) {
  const url = new URLSearchParams();

  url.set("section", "encounter");

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.set(key, value);
    }
  }

  return `/dashboard?${url.toString()}`;
}

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="gap-1 border-primary/30 bg-primary/12 text-[#e8ddff]" variant="outline">
      {children}
      <X className="size-3" aria-hidden="true" />
    </Badge>
  );
}

function ArtworkField({
  defaultValue,
  label,
}: {
  defaultValue: string | null | undefined;
  label: string;
}) {
  const [artPath, setArtPath] = React.useState(defaultValue ?? "");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setArtPath(defaultValue ?? "");
  }, [defaultValue]);

  return (
    <div className="grid gap-3">
      <label className="text-sm font-medium text-event-copy-strong" htmlFor="artPath">
        {label}
      </label>
      <div className="flex items-end gap-4">
        <span className="relative flex size-20 shrink-0 overflow-hidden rounded-lg border border-event-panel-border bg-event-panel-surface-soft">
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="80px"
            src={artPath || fallbackArt}
          />
        </span>
        <div className="grid min-w-0 flex-1 gap-2">
          <Input
            className={adminFieldClass}
            id="artPath"
            name="artPath"
            onChange={(event) => setArtPath(event.target.value)}
            placeholder={fallbackArt}
            ref={inputRef}
            value={artPath}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.focus()}
            >
              <ImageIcon className="size-4" aria-hidden="true" />
              Заменить
            </Button>
            <Button
              className="border-red-400/35 text-red-200 hover:bg-red-500/10"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setArtPath("")}
            >
              Удалить
            </Button>
          </div>
        </div>
      </div>
      <p className="text-xs text-event-copy">Рекомендуемый размер: 512x512 PNG.</p>
    </div>
  );
}

function GroupSheetForm({
  formId,
  group,
  onSubmit,
}: {
  formId: string;
  group: AdminEncounterGroupRow | null;
  onSubmit: () => void;
}) {
  return (
    <form action={saveActivityGroupFormAction} className="grid gap-5" id={formId} onSubmit={onSubmit}>
      <input name="id" type="hidden" value={group?.id ?? ""} />
      <input name="isActive" type="hidden" value="false" />

      <ArtworkField defaultValue={group?.artPath} label="Иконка / изображение" />

      <div className="grid gap-2">
        <label className="text-sm font-medium text-event-copy-strong" htmlFor="nameRu">
          Публичное имя (RU)
        </label>
        <Input
          className={adminFieldClass}
          defaultValue={group?.nameRu ?? ""}
          id="nameRu"
          name="nameRu"
          required
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-event-copy-strong" htmlFor="nameEn">
          Public name (EN)
        </label>
        <Input
          className={adminFieldClass}
          defaultValue={group?.nameEn ?? ""}
          id="nameEn"
          name="nameEn"
          required
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-event-copy-strong" htmlFor="slug">
          Slug
        </label>
        <Input
          className={adminFieldClass}
          defaultValue={group?.slug ?? ""}
          id="slug"
          name="slug"
          pattern="[a-z0-9-]+"
          required
        />
        <p className="text-xs text-event-copy">
          Уникальный идентификатор: латиница, цифры, дефисы.
        </p>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-event-copy-strong" htmlFor="sortOrder">
          Порядок
        </label>
        <Input
          className={adminFieldClass}
          defaultValue={group?.sortOrder ?? 0}
          id="sortOrder"
          name="sortOrder"
          type="number"
        />
      </div>
      <label className="flex items-center justify-between gap-4 rounded-lg border border-event-panel-border bg-event-panel-surface-soft p-3">
        <span>
          <span className="block text-sm font-medium text-event-copy-strong">
            Статус
          </span>
          <span className="mt-1 block text-xs text-event-copy">
            Элемент доступен на сайте и виден пользователям.
          </span>
        </span>
        <Switch
          defaultChecked={group?.isActive ?? true}
          name="isActive"
          value="true"
        />
      </label>
    </form>
  );
}

function ActivitySheetForm({
  activity,
  difficulties,
  formId,
  groups,
  locale,
  onSubmit,
  tab,
}: {
  activity: AdminEncounterActivityRow | null;
  difficulties: AdminEncounterDifficultyRow[];
  formId: string;
  groups: AdminEncounterGroupRow[];
  locale: AppLocale;
  onSubmit: () => void;
  tab: Exclude<AdminEncounterTab, "addons">;
}) {
  const selectedGroupIds = new Set(
    activity?.groupItems.map((item) => item.groupId) ?? [],
  );
  const selectedPrimaryGroupId =
    activity?.groupItems[0]?.groupId ?? groups[0]?.id ?? "";
  const selectedDifficultyIds = new Set(
    activity?.difficultyOptions?.map((item) => item.difficultyId) ?? [],
  );
  const kind = activity?.kind ?? getActivityKindForTab(tab);

  return (
    <form action={saveActivitySheetFormAction} className="grid gap-5" id={formId} onSubmit={onSubmit}>
      <input name="id" type="hidden" value={activity?.id ?? ""} />
      <input name="kind" type="hidden" value={kind} />
      <input name="isActive" type="hidden" value="false" />

      <ArtworkField defaultValue={activity?.artPath} label="Иконка / изображение" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-event-copy-strong" htmlFor="nameRu">
            Публичное имя (RU)
          </label>
          <Input
            className={adminFieldClass}
            defaultValue={activity?.nameRu ?? ""}
            id="nameRu"
            name="nameRu"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-event-copy-strong" htmlFor="nameEn">
            Public name (EN)
          </label>
          <Input
            className={adminFieldClass}
            defaultValue={activity?.nameEn ?? ""}
            id="nameEn"
            name="nameEn"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-event-copy-strong" htmlFor="shortNameRu">
            Короткое имя RU
          </label>
          <Input
            className={adminFieldClass}
            defaultValue={activity?.shortNameRu ?? ""}
            id="shortNameRu"
            name="shortNameRu"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-event-copy-strong" htmlFor="shortNameEn">
            Short name EN
          </label>
          <Input
            className={adminFieldClass}
            defaultValue={activity?.shortNameEn ?? ""}
            id="shortNameEn"
            name="shortNameEn"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-event-copy-strong" htmlFor="slug">
            Slug
          </label>
          <Input
            className={adminFieldClass}
            defaultValue={activity?.slug ?? ""}
            id="slug"
            name="slug"
            pattern="[a-z0-9-]+"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-event-copy-strong" htmlFor="sortOrder">
            Порядок
          </label>
          <Input
            className={adminFieldClass}
            defaultValue={activity?.sortOrder ?? 0}
            id="sortOrder"
            name="sortOrder"
            type="number"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-event-copy-strong" htmlFor="aliases">
          Aliases
        </label>
        <Textarea
          className={cn("min-h-20", adminFieldClass)}
          defaultValue={activity?.aliases.join(", ") ?? ""}
          id="aliases"
          name="aliases"
          placeholder="aliases через запятую или новую строку"
        />
      </div>

      {kind === "DUNGEON" || kind === "RAID" ? (
        <EncounterAddonCombobox
          groups={groups}
          inputId={`${kind.toLowerCase()}AddonId`}
          locale={locale}
          selectedGroupId={selectedPrimaryGroupId}
        />
      ) : (
        <div className="grid gap-3">
          <div className="text-sm font-medium text-event-copy-strong">
            Дополнения
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((group) => (
              <label
                className="flex items-center gap-2 rounded-md border border-event-panel-border bg-event-panel-surface-soft px-3 py-2 text-sm text-event-copy-strong"
                key={group.id}
              >
                <Checkbox
                  defaultChecked={selectedGroupIds.has(group.id)}
                  name="groupIds"
                  value={group.id}
                />
                <span className="truncate">{getLocalizedName(locale, group)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {kind === "RAID" ? (
        <div className="grid gap-3">
          <div className="text-sm font-medium text-event-copy-strong">
            Сложности рейда
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {difficulties.map((difficulty) => {
              const checked = activity
                ? selectedDifficultyIds.has(difficulty.id)
                : standardDifficultySlugs.has(difficulty.slug);

              return (
                <label
                  className="flex items-center gap-2 rounded-md border border-event-panel-border bg-event-panel-surface-soft px-3 py-2 text-sm text-event-copy-strong"
                  key={difficulty.id}
                >
                  <Checkbox
                    defaultChecked={checked}
                    name="difficultyIds"
                    value={difficulty.id}
                  />
                  <span>{getLocalizedDifficulty(locale, difficulty)}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <label className="flex items-center justify-between gap-4 rounded-lg border border-event-panel-border bg-event-panel-surface-soft p-3">
        <span>
          <span className="block text-sm font-medium text-event-copy-strong">
            Статус
          </span>
          <span className="mt-1 block text-xs text-event-copy">
            Элемент доступен на сайте и виден пользователям.
          </span>
        </span>
        <Switch
          defaultChecked={activity?.isActive ?? true}
          name="isActive"
          value="true"
        />
      </label>
    </form>
  );
}

function EncounterSheet({
  difficulties,
  groups,
  locale,
  onOpenChange,
  sheetState,
}: {
  difficulties: AdminEncounterDifficultyRow[];
  groups: AdminEncounterGroupRow[];
  locale: AppLocale;
  onOpenChange: (open: boolean) => void;
  sheetState: EncounterSheetState | null;
}) {
  const formId = sheetState
    ? `encounter-${sheetState.type}-${sheetState.item?.id ?? "new"}`
    : "encounter-form";
  const isEditing = Boolean(sheetState?.item);
  const title = sheetState
    ? `${isEditing ? "Редактировать" : "Добавить"} ${
        sheetState.type === "group"
          ? "дополнение"
          : getActivityTypeLabel(
              sheetState.item?.kind ?? getActivityKindForTab(sheetState.tab),
            ).toLowerCase()
      }`
    : "Элемент";

  return (
    <Sheet open={Boolean(sheetState)} onOpenChange={onOpenChange}>
      <SheetContent className="border-event-panel-border bg-[linear-gradient(180deg,rgba(13,30,57,0.98),rgba(5,15,31,0.99))] sm:max-w-[500px]">
        {sheetState ? (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-event-panel-border">
              <SheetTitle className="text-event-copy-strong">{title}</SheetTitle>
              <SheetDescription className="text-event-copy">
                Управление полями каталога и видимостью элемента.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-6 py-5">
                {sheetState.type === "group" ? (
                  <GroupSheetForm
                    formId={formId}
                    group={sheetState.item}
                    onSubmit={() => onOpenChange(false)}
                  />
                ) : (
                  <ActivitySheetForm
                    activity={sheetState.item}
                    difficulties={difficulties}
                    formId={formId}
                    groups={groups}
                    locale={locale}
                    onSubmit={() => onOpenChange(false)}
                    tab={sheetState.tab}
                  />
                )}
              </div>
            </ScrollArea>

            <div className="grid grid-cols-2 gap-3 border-t border-event-panel-border p-6">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Отмена
                </Button>
              </SheetClose>
              <Button form={formId} type="submit">
                <Save className="size-4" aria-hidden="true" />
                Сохранить
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function AdminEncounterWorkspace({
  activities,
  activeTab,
  difficulties,
  dungeons,
  groups,
  locale,
  query,
  raids,
  sort,
  statusFilter,
}: AdminEncounterWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheetState, setSheetState] = React.useState<EncounterSheetState | null>(
    null,
  );
  const rows = getRows({ activeTab, activities, dungeons, groups, raids });
  const hasFilters = query || statusFilter !== "all" || sort !== "order";
  function changeTab(value: string) {
    const nextTab = value as AdminEncounterTab;
    const params = new URLSearchParams(searchParams.toString());

    params.set("section", "encounter");
    params.set("encounterTab", nextTab);
    params.delete("q");

    router.push(`${pathname}?${params.toString()}`);
  }

  function openCreateSheet() {
    if (activeTab === "addons") {
      setSheetState({ item: null, tab: "addons", type: "group" });
      return;
    }

    setSheetState({ item: null, tab: activeTab, type: "activity" });
  }

  return (
    <div className="grid gap-5">
      <header className="flex min-h-20 items-center justify-between gap-4">
        <h1 className="m-0 text-3xl font-semibold text-event-copy-strong md:text-4xl">
          Энкаунтер
        </h1>
        <Button className="shrink-0" onClick={openCreateSheet} type="button">
          <Plus className="size-4" aria-hidden="true" />
          Добавить элемент
        </Button>
      </header>

      <Card className={cn("overflow-hidden rounded-lg", adminSurfaceClass)}>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={changeTab}>
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-none border-b border-event-panel-border bg-transparent p-3 md:grid-cols-4">
              {encounterTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <TabsTrigger
                    className="gap-2 rounded-md border border-transparent px-4 py-3 text-event-copy data-[state=active]:border-primary/45 data-[state=active]:bg-primary/16 data-[state=active]:text-[#e8ddff] data-[state=active]:shadow-none"
                    key={tab.value}
                    value={tab.value}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card className={cn("overflow-hidden rounded-lg", adminSurfaceClass)}>
        <CardContent className="p-0">
          <form
            className="grid gap-3 border-b border-event-panel-border p-4 xl:grid-cols-[minmax(260px,1fr)_180px_220px_auto]"
            method="get"
          >
            <input name="section" type="hidden" value="encounter" />
            <input name="encounterTab" type="hidden" value={activeTab} />
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
                placeholder="Поиск по названию или slug..."
              />
            </div>

            <Select defaultValue={statusFilter} name="status">
              <SelectTrigger className={cn("h-10", adminFieldClass)}>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Скрытые</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue={sort} name="sort">
              <SelectTrigger className={cn("h-10", adminFieldClass)}>
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Сортировка: Порядок</SelectItem>
                <SelectItem value="name">Сортировка: Название</SelectItem>
                <SelectItem value="updated">Сортировка: Обновлено</SelectItem>
              </SelectContent>
            </Select>

            <Button className="min-w-24" type="submit" variant="secondary">
              Найти
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-3 border-b border-event-panel-border px-4 py-3 text-sm text-event-copy">
            <span>Найдено: {rows.length}</span>
            {query ? <FilterChip>Поиск: {query}</FilterChip> : null}
            {statusFilter !== "all" ? (
              <FilterChip>
                Статус: {statusFilter === "active" ? "активные" : "скрытые"}
              </FilterChip>
            ) : null}
            {sort !== "order" ? (
              <FilterChip>
                Сортировка: {sort === "name" ? "название" : "обновлено"}
              </FilterChip>
            ) : null}
            {hasFilters ? (
              <Button asChild className="h-auto px-0 text-event-cyan" variant="ghost">
                <Link href={buildEncounterHref({ encounterTab: activeTab })}>
                  Очистить все
                </Link>
              </Button>
            ) : null}
          </div>

          <ScrollArea className="h-[560px]" scrollbarOrientation="both">
            <Table className="min-w-[1040px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Элемент</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Связанные сущности</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Обновлено</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-32 text-center text-event-copy" colSpan={6}>
                      Ничего не найдено.
                    </TableCell>
                  </TableRow>
                ) : null}

                {activeTab === "addons"
                  ? groups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="w-[300px]">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex size-14 shrink-0 overflow-hidden rounded-lg border border-event-panel-border bg-popover">
                              <Image
                                alt=""
                                className="object-cover"
                                fill
                                sizes="56px"
                                src={group.artPath || fallbackArt}
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-event-copy-strong">
                                {getLocalizedName(locale, group)}
                              </div>
                              <div className="mt-1 text-xs text-event-copy">
                                {group._count.items} элементов
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-event-copy-strong">
                          {group.slug}
                        </TableCell>
                        <TableCell className="text-event-copy">
                          {group._count.items} элементов
                        </TableCell>
                        <TableCell>
                          <StatusBadge active={group.isActive} />
                        </TableCell>
                        <TableCell className="text-event-copy-strong">
                          {formatDate(group.updatedAt, locale)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            aria-label={`Редактировать ${getLocalizedName(locale, group)}`}
                            className={cn("size-9 rounded-md", adminFieldClass)}
                            size="icon"
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setSheetState({ item: group, tab: "addons", type: "group" })
                            }
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  : (rows as AdminEncounterActivityRow[]).map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="w-[300px]">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex size-14 shrink-0 overflow-hidden rounded-lg border border-event-panel-border bg-popover">
                              <Image
                                alt=""
                                className="object-cover"
                                fill
                                sizes="56px"
                                src={activity.artPath || fallbackArt}
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-event-copy-strong">
                                {getLocalizedName(locale, activity)}
                              </div>
                              <div className="mt-1 text-xs text-event-copy">
                                {activity.shortNameRu || activity.shortNameEn}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-event-copy-strong">
                          {activity.slug}
                        </TableCell>
                        <TableCell className="min-w-[220px]">
                          <div className="text-sm text-event-copy-strong">
                            {getGroupNames(locale, activity.groupItems) ||
                              "без дополнения"}
                          </div>
                          {activity.kind === "RAID" ? (
                            <div className="mt-1 text-xs text-event-copy">
                              {getDifficultyNames(locale, activity) ||
                                "базовые сложности"}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge active={activity.isActive} />
                        </TableCell>
                        <TableCell className="text-event-copy-strong">
                          {formatDate(activity.updatedAt, locale)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            aria-label={`Редактировать ${getLocalizedName(locale, activity)}`}
                            className={cn("size-9 rounded-md", adminFieldClass)}
                            size="icon"
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setSheetState({
                                item: activity,
                                tab: activeTab as Exclude<AdminEncounterTab, "addons">,
                                type: "activity",
                              })
                            }
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex items-center justify-between border-t border-event-panel-border px-4 py-4 text-sm text-event-copy">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Строк на странице: 80
            </div>
            <div className="rounded-md border border-primary/35 bg-primary/14 px-3 py-1 text-event-copy-strong">
              1
            </div>
          </div>
        </CardContent>
      </Card>

      <EncounterSheet
        difficulties={difficulties}
        groups={groups}
        locale={locale}
        sheetState={sheetState}
        onOpenChange={(open) => {
          if (!open) {
            setSheetState(null);
          }
        }}
      />
    </div>
  );
}
