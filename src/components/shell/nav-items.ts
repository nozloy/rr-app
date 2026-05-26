import {
  Home,
  Import,
  LayoutDashboard,
  SearchCheck,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type HeaderNavItem = {
  auth?: "all" | "authenticated";
  href: string;
  icon: LucideIcon;
  label: string;
};

export const headerNavItems: HeaderNavItem[] = [
  { href: "/", icon: Home, label: "Главная" },
  {
    auth: "authenticated",
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Кабинет",
  },
  {
    auth: "authenticated",
    href: "/banners/new",
    icon: WandSparkles,
    label: "Создать баннер",
  },
  { href: "/banners/import", icon: Import, label: "Импорт" },
  { href: "/raidcheck", icon: SearchCheck, label: "Проверить кд" },
];

export const accountMenuItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Кабинет",
  },
  {
    href: "/banners/new",
    icon: WandSparkles,
    label: "Создать баннер",
  },
  {
    href: "/banners/import",
    icon: Import,
    label: "Импорт из аддона",
  },
  {
    href: "/raidcheck",
    icon: SearchCheck,
    label: "Проверить кд рейда",
  },
];
