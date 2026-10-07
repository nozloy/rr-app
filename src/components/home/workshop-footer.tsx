"use client";

import { GearIcon, WrenchIcon } from "@phosphor-icons/react";
import { getWorkshopCopy } from "@/components/home/workshop-copy";
import { LocaleSwitch } from "@/components/shell/locale-switch";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AppLocale } from "@/lib/i18n";

export function WorkshopFooter({ locale }: { locale: AppLocale }) {
  const copy = getWorkshopCopy(locale);

  return (
    <footer className="workshop-footer">
      <p className="workshop-footer-copy"><WrenchIcon weight="fill" aria-hidden="true" /><span>{copy.footer}</span></p>
      <div className="workshop-footer-end">
        <p>{copy.motto}<span>{copy.more}</span></p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={copy.settings} className="workshop-settings">
              <GearIcon weight="fill" data-icon="inline-start" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="workshop-overlay">
            <DropdownMenuLabel>{copy.settings}</DropdownMenuLabel>
            <div className="px-2 py-3"><LocaleSwitch /></div>
          </DropdownMenuContent>
        </DropdownMenu>
        <GearIcon className="workshop-footer-gear" weight="fill" aria-hidden="true" />
      </div>
    </footer>
  );
}
