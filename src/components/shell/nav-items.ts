import {
  CalendarPlus,
  Home,
  SearchCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { t, type AppLocale } from "@/lib/i18n";

export type HeaderNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export function getHeaderNavItems(locale: AppLocale): HeaderNavItem[] {
  return [
    { href: "/", icon: Home, label: t(locale, "header.home") },
    {
      href: "/raidcheck",
      icon: SearchCheck,
      label: t(locale, "header.raidCheck"),
    },
  ];
}

export function getAuthenticatedHeaderNavItems(
  locale: AppLocale,
): HeaderNavItem[] {
  return [
    {
      href: "/events/new",
      icon: CalendarPlus,
      label: t(locale, "header.createRaid"),
    },
  ];
}

export function getAccountMenuItems(locale: AppLocale): HeaderNavItem[] {
  return [
    {
      href: "/events/new",
      icon: CalendarPlus,
      label: t(locale, "header.createRaid"),
    },
    {
      href: "/raidcheck",
      icon: SearchCheck,
      label: t(locale, "header.raidCheck"),
    },
  ];
}
