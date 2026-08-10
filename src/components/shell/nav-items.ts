import {
  CalendarPlus,
  Home,
  LayoutDashboard,
  SearchCheck,
  UserRound,
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
  isAdmin = false,
): HeaderNavItem[] {
  const items: HeaderNavItem[] = [
    {
      href: "/profile",
      icon: UserRound,
      label: t(locale, "header.profile"),
    },
    {
      href: "/events/new",
      icon: CalendarPlus,
      label: t(locale, "header.createRaid"),
    },
  ];

  if (isAdmin) {
    items.push({
      href: "/dashboard",
      icon: LayoutDashboard,
      label: t(locale, "header.adminDashboard"),
    });
  }

  return items;
}

export function getAccountMenuItems(
  locale: AppLocale,
  isAdmin = false,
): HeaderNavItem[] {
  const items: HeaderNavItem[] = [
    {
      href: "/profile",
      icon: UserRound,
      label: t(locale, "header.profile"),
    },
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

  if (isAdmin) {
    items.push({
      href: "/dashboard",
      icon: LayoutDashboard,
      label: t(locale, "header.adminDashboard"),
    });
  }

  return items;
}
