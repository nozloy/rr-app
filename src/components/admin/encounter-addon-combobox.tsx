"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import type { AdminEncounterGroupRow } from "@/components/admin/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type EncounterAddonComboboxProps = {
  groups: AdminEncounterGroupRow[];
  inputId?: string;
  inputName?: string;
  label?: string;
  locale: AppLocale;
  selectedGroupId: string;
};

const adminSurfaceClass =
  "border-event-panel-border bg-[linear-gradient(180deg,rgba(13,30,57,0.82),rgba(5,15,31,0.96))] shadow-event-panel";
const adminFieldClass =
  "border-event-panel-border bg-[rgba(3,13,27,0.62)] text-event-copy-strong placeholder:text-event-copy/55 focus-visible:border-event-cyan/60 focus-visible:ring-event-cyan/30";

function getLocalizedName(
  locale: AppLocale,
  value: { nameEn: string; nameRu: string },
) {
  return locale === "ru" ? value.nameRu : value.nameEn;
}

export function EncounterAddonCombobox({
  groups,
  inputId = "addonId",
  inputName = "groupIds",
  label = "Дополнение",
  locale,
  selectedGroupId,
}: EncounterAddonComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [value, setValue] = React.useState(selectedGroupId);
  const selectedGroup = groups.find((group) => group.id === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = normalizedQuery
    ? groups.filter((group) => {
        const groupLabel = getLocalizedName(locale, group).toLowerCase();

        return (
          groupLabel.includes(normalizedQuery) ||
          group.slug.toLowerCase().includes(normalizedQuery)
        );
      })
    : groups;

  React.useEffect(() => {
    setValue(selectedGroupId);
  }, [selectedGroupId]);

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-event-copy-strong" htmlFor={inputId}>
        {label}
      </label>
      <input id={inputId} name={inputName} type="hidden" value={value} />
      {open ? (
        <button
          aria-label="Закрыть список дополнений"
          className="fixed inset-0 z-[55] cursor-default bg-black/45 backdrop-blur-[1px]"
          type="button"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            className={cn("h-10 justify-between", adminFieldClass)}
            disabled={groups.length === 0}
            role="combobox"
            type="button"
            variant="outline"
          >
            <span className="truncate">
              {selectedGroup
                ? getLocalizedName(locale, selectedGroup)
                : "Выберите дополнение"}
            </span>
            <ChevronsUpDown className="size-4 opacity-60" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            "z-[60] w-[var(--radix-popover-trigger-width)] p-2",
            adminSurfaceClass,
          )}
          onWheel={(event) => event.stopPropagation()}
          portalled={false}
        >
          <Input
            aria-label="Поиск дополнения"
            className={cn("h-9", adminFieldClass)}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск дополнения..."
            value={query}
          />
          <ScrollArea
            className="mt-2 h-56"
            onWheel={(event) => event.stopPropagation()}
          >
            <div className="grid gap-1 pr-2">
              {filteredGroups.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-event-copy">
                  Ничего не найдено.
                </div>
              ) : null}
              {filteredGroups.map((group) => {
                const selected = group.id === value;

                return (
                  <Button
                    aria-selected={selected}
                    className={cn(
                      "h-9 justify-start px-3 text-left",
                      selected
                        ? "bg-primary/16 text-event-copy-strong"
                        : "text-event-copy-strong hover:bg-event-panel-surface-soft",
                    )}
                    key={group.id}
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setValue(group.id);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{getLocalizedName(locale, group)}</span>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
