import {
  Bell,
  CheckCircle2,
  Coins,
  Crown,
  Download,
  Flame,
  Gem,
  KeyRound,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { currentRaidInstances, type RaidDefinition } from "@/lib/raids";

const raidBySlug = new Map(currentRaidInstances.map((raid) => [raid.slug, raid]));

function dashboardRaid(slug: string, fallbackIndex: number): RaidDefinition {
  const fallback = currentRaidInstances[fallbackIndex] ?? currentRaidInstances[0];

  if (!fallback) {
    throw new Error("Dashboard raid data requires at least one raid definition.");
  }

  return raidBySlug.get(slug) ?? fallback;
}

export const dashboardNavItems = [
  { label: "Главная", href: "/" },
  { label: "Кабинет", href: "/dashboard" },
  { label: "Создать баннер", href: "/banners/new" },
  { label: "Импорт", href: "/banners/import" },
  { label: "Проверить кд", href: "/raidcheck" },
];

export const dashboardSidebarStats = [
  { label: "Персонажей", value: "auto", icon: Sparkles, tone: "silver" },
  { label: "Будущих активностей", value: "4", icon: Shield, tone: "violet" },
  { label: "Завершено за неделю", value: "8", icon: Trophy, tone: "gold" },
  { label: "Прогресс в рейдах", value: "58%", icon: Flame, tone: "blue" },
];

export type DashboardAction = {
  href?: string;
  icon: LucideIcon;
  label: string;
  variant: "primary" | "outline";
};

export const dashboardActions: DashboardAction[] = [
  { href: "/banners/new", icon: Swords, label: "Создать баннер", variant: "primary" },
  { icon: UsersRound, label: "Найти группу", variant: "outline" },
  { href: "/raidcheck", icon: Search, label: "Проверить кд рейда", variant: "outline" },
  {
    href: "/banners/import",
    icon: Download,
    label: "Импорт из аддона",
    variant: "outline",
  },
];

export const raidProgressCards = [
  {
    raid: dashboardRaid("march-on-queldanas", 0),
    normal: 10,
    heroic: 7,
    mythic: 3,
    total: 67,
    rewards: "4/12",
  },
  {
    raid: dashboardRaid("the-voidspire", 1),
    normal: 10,
    heroic: 6,
    mythic: 2,
    total: 60,
    rewards: "4/12",
  },
  {
    raid: dashboardRaid("the-dreamrift", 2),
    normal: 10,
    heroic: 2,
    mythic: 1,
    total: 43,
    rewards: "2/12",
  },
];

export const upcomingActivities = [
  {
    title: "Шпиль Бездны (Heroic)",
    date: "24.05.2026",
    time: "20:00",
    type: "Рейд",
    role: "DPS",
    party: "24/30",
    reward: "25 000",
    icon: raidBySlug.get("the-voidspire")?.artPath,
  },
  {
    title: "+15 Ключ: Улицы Чудес",
    date: "25.05.2026",
    time: "19:00",
    type: "Mythic+",
    role: "DPS",
    party: "4/5",
    reward: "5 000",
    icon: "/dungeons/Magisters_Terrace_styled_16x9.jpg",
  },
  {
    title: "Провал снов (Mythic)",
    date: "26.05.2026",
    time: "20:30",
    type: "Рейд",
    role: "DPS",
    party: "18/20",
    reward: "30 000",
    icon: raidBySlug.get("the-dreamrift")?.artPath,
  },
  {
    title: "Фарм маунта: Сумеречный Деспот",
    date: "27.05.2026",
    time: "18:30",
    type: "Фарм",
    role: "DPS",
    party: "10/15",
    reward: "10 000",
    icon: "/raids/the_bastion_of_twilight_styled_16x9.jpg",
  },
];

export const pastActivities = [
  {
    title: "Марш на Кель'Данас (Heroic)",
    date: "23.05.2026",
    party: "24/30",
    reward: "25 000",
    status: "Завершено",
    icon: raidBySlug.get("march-on-queldanas")?.artPath,
  },
  {
    title: "+14 Ключ: Театр Боли",
    date: "22.05.2026",
    party: "5/5",
    reward: "5 000",
    status: "Завершено",
    icon: "/dungeons/Pit_of_Saron_styled_16x9.jpg",
  },
  {
    title: "Шпиль Бездны (Normal)",
    date: "21.05.2026",
    party: "30/30",
    reward: "15 000",
    status: "Завершено",
    icon: raidBySlug.get("the-voidspire")?.artPath,
  },
  {
    title: "Еженедельник: Победить 3 боссов",
    date: "19.05.2026",
    party: "-",
    reward: "-",
    status: "Гильдия",
    icon: "/home/raid-reminder-mark.png",
  },
];

export const weekCalendar = [
  { day: "Пн", date: "19", dots: ["raid"] },
  { day: "Вт", date: "20", dots: ["key", "misc"] },
  { day: "Ср", date: "21", dots: ["raid"] },
  { day: "Чт", date: "22", dots: ["farm"] },
  { day: "Пт", date: "23", dots: ["misc"] },
  { day: "Сб", date: "24", dots: ["raid", "key", "misc"], active: true },
  { day: "Вс", date: "25", dots: ["farm"] },
];

export const mythicRuns = [
  { level: "+20", label: "Лучший", dungeon: "ML" },
  { level: "+18", label: "NW", dungeon: "NW" },
  { level: "+17", label: "SV", dungeon: "SV" },
  { level: "+16", label: "TOS", dungeon: "TOS" },
  { level: "+15", label: "SR", dungeon: "SR" },
  { level: "+14", label: "COEN", dungeon: "COEN" },
];

export const achievements = [
  {
    title: "Герой Кель'Данаса",
    text: "Победите 10 боссов в Марше...",
    date: "23.05.2026",
    icon: raidBySlug.get("march-on-queldanas")?.artPath,
  },
  {
    title: "Покоритель Бездны",
    text: "Победите 6 боссов в Шпиле...",
    date: "22.05.2026",
    icon: raidBySlug.get("the-dreamrift")?.artPath,
  },
  {
    title: "Мифический ключник",
    text: "Пройдите 15 ключей 15+",
    date: "20.05.2026",
    icon: "/dungeons/Nexus_Point_Xenas_styled_16x9.jpg",
  },
  {
    title: "Коллекционер зверей",
    text: "Получите 100 маунтов",
    date: "18.05.2026",
    icon: "/raids/terrace_of_endless_spring_styled_16x9.jpg",
  },
];

export const accountFeed = [
  { text: "Обновлена экипировка персонажа", time: "2 мин. назад", icon: Gem, tone: "violet" },
  { text: "Завершена активность «Марш на Кель'Данас»", time: "1 ч. назад", icon: CheckCircle2, tone: "blue" },
  { text: "Получено достижение «Герой Кель'Данаса»", time: "5 мин. назад", icon: Trophy, tone: "gold" },
  { text: "Присоединились к группе «Шпиль Бездны»", time: "2 ч. назад", icon: UsersRound, tone: "green" },
];

export const dashboardTopbarIcons = {
  bell: Bell,
  coins: Coins,
  key: KeyRound,
  search: Search,
  sword: Swords,
  trophy: Trophy,
  crown: Crown,
};
