import {
  CalendarPlus,
  Home,
  SearchCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type HeaderNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export const headerNavItems: HeaderNavItem[] = [
  { href: "/", icon: Home, label: "Главная" },
  { href: "/raidcheck", icon: SearchCheck, label: "Проверить кд" },
];

export const authenticatedHeaderNavItems: HeaderNavItem[] = [
  { href: "/events/new", icon: CalendarPlus, label: "Создать рейд" },
];

export const accountMenuItems = [
  {
    href: "/events/new",
    icon: CalendarPlus,
    label: "Создать рейд",
  },
  {
    href: "/raidcheck",
    icon: SearchCheck,
    label: "Проверить кд рейда",
  },
];
