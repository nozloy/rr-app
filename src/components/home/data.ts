import {
  CalendarDays,
  Coins,
  Crown,
  Dice5,
  Gem,
  KeyRound,
  LogIn,
  Search,
  Server,
  Shield,
  ShieldPlus,
  Sparkles,
  Swords,
  Trophy,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { currentRaidInstances } from "@/lib/raids";

export type HomeNavItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

export type HomeSelectOption = {
  label: string;
  value: string;
};

export type HomeFilter = {
  label: string;
  value: string;
  icon: LucideIcon;
  options: HomeSelectOption[];
};

export type FeaturedRaid = {
  slug: string;
  title: string;
  artPath: string;
  leader: string;
  date: string;
  time: string;
  party: string;
  slotPrice: string;
  difficulties: string[];
};

export type ActivityItem = {
  label: string;
  icon: LucideIcon;
  tone: "green" | "violet" | "blue" | "gold" | "purple" | "silver";
};

export type RoleRequirement = {
  label: string;
  icon: LucideIcon;
  imagePath: string;
  value: string;
  tone: "tank" | "healer" | "dps";
};

export type FeatureTile = {
  title: string;
  text: string;
  icon: LucideIcon;
  tone: "battle" | "calendar" | "gold" | "team";
};

export const homeNavItems: HomeNavItem[] = [
  { label: "Главная", href: "/", isActive: true },
  { label: "Проверить кд", href: "/raidcheck" },
];

export const homeFilters: HomeFilter[] = [
  {
    label: "Тип активности",
    value: "any",
    icon: Swords,
    options: [
      { label: "Любой", value: "any" },
      { label: "Рейды", value: "raids" },
      { label: "Ключи", value: "keys" },
      { label: "Фарм", value: "farm" },
    ],
  },
  {
    label: "Роль",
    value: "any",
    icon: Shield,
    options: [
      { label: "Любая", value: "any" },
      { label: "Танк", value: "tank" },
      { label: "Хил", value: "healer" },
      { label: "ДПС", value: "dps" },
    ],
  },
  {
    label: "Дата",
    value: "any",
    icon: CalendarDays,
    options: [
      { label: "Любая дата", value: "any" },
      { label: "Сегодня", value: "today" },
      { label: "Завтра", value: "tomorrow" },
      { label: "На неделе", value: "week" },
    ],
  },
  {
    label: "Сервер",
    value: "any",
    icon: Server,
    options: [
      { label: "Любой сервер", value: "any" },
      { label: "Свежеватель Душ", value: "soulflayer" },
      { label: "Гордунни", value: "gordunni" },
      { label: "Ревущий фьорд", value: "howling-fjord" },
    ],
  },
  {
    label: "Стоимость слота",
    value: "any",
    icon: Coins,
    options: [
      { label: "Любая", value: "any" },
      { label: "Без стоимости", value: "free" },
      { label: "До 15 000", value: "15000" },
      { label: "До 25 000", value: "25000" },
    ],
  },
];

const raidBySlug = new Map(currentRaidInstances.map((raid) => [raid.slug, raid]));

export const featuredRaids: FeaturedRaid[] = [
  {
    slug: "march-on-queldanas",
    title: raidBySlug.get("march-on-queldanas")?.name ?? "Марш на Кель'Данас",
    artPath:
      raidBySlug.get("march-on-queldanas")?.artPath ??
      "/raids/march_on_queldanas_styled_16x9.jpg",
    leader: "Kaelthas",
    date: "25 мая",
    time: "20:00",
    party: "23/30",
    slotPrice: "25 000 золота",
    difficulties: ["LFR", "NORMAL", "HEROIC", "MYTHIC"],
  },
  {
    slug: "the-voidspire",
    title: raidBySlug.get("the-voidspire")?.name ?? "Шпиль Бездны",
    artPath:
      raidBySlug.get("the-voidspire")?.artPath ??
      "/raids/the_voidspire_styled_16x9.jpg",
    leader: "VoidWalker",
    date: "25 мая",
    time: "19:30",
    party: "18/30",
    slotPrice: "25 000 золота",
    difficulties: ["LFR", "NORMAL", "HEROIC", "MYTHIC"],
  },
  {
    slug: "the-dreamrift",
    title: raidBySlug.get("the-dreamrift")?.name ?? "Провал снов",
    artPath:
      raidBySlug.get("the-dreamrift")?.artPath ??
      "/raids/the_dreamrift_styled_16x9.jpg",
    leader: "Dreamseer",
    date: "26 мая",
    time: "21:00",
    party: "27/30",
    slotPrice: "15 000 золота",
    difficulties: ["LFR", "NORMAL", "HEROIC", "MYTHIC"],
  },
];

export const activityItems: ActivityItem[] = [
  { label: "Ключи", icon: KeyRound, tone: "green" },
  { label: "Фарм маунтов", icon: WandSparkles, tone: "violet" },
  { label: "Фарм ресурсов", icon: Gem, tone: "blue" },
  { label: "Ачивки", icon: Trophy, tone: "gold" },
  { label: "Трансмог", icon: Sparkles, tone: "purple" },
  { label: "Рейдерио", icon: Dice5, tone: "silver" },
];

export const roleRequirements: RoleRequirement[] = [
  {
    label: "Танк",
    icon: Shield,
    imagePath: "/roles/tank.png",
    value: "1/2",
    tone: "tank",
  },
  {
    label: "Хил",
    icon: ShieldPlus,
    imagePath: "/roles/healer.png",
    value: "2/5",
    tone: "healer",
  },
  {
    label: "ДПС",
    icon: Swords,
    imagePath: "/roles/dps.png",
    value: "8/15",
    tone: "dps",
  },
];

export const featureTiles: FeatureTile[] = [
  {
    title: "Вход через Battle.net",
    text: "Безопасный вход без паролей. Прогрессия и персонажи под рукой.",
    icon: LogIn,
    tone: "battle",
  },
  {
    title: "Планирование событий",
    text: "Укажи время, роли и требования. Участники видят все заранее.",
    icon: CalendarDays,
    tone: "calendar",
  },
  {
    title: "Слоты за золото",
    text: "Назначай цену за слот и собирай группу быстро и прозрачно.",
    icon: Coins,
    tone: "gold",
  },
  {
    title: "Гибкие роли и состав",
    text: "Настраивай роли, требования и количество участников для успеха.",
    icon: UsersRound,
    tone: "team",
  },
];

export const footerLinks = ["О проекте", "Правила", "Поддержка", "FAQ", "Контакты"];

export const socialLinks = [
  { label: "Discord", icon: Crown },
  { label: "VK", icon: UsersRound },
  { label: "Telegram", icon: Search },
  { label: "Компас", icon: Sparkles },
];
