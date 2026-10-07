import { ClipboardTextIcon, ShieldCheckIcon, UsersThreeIcon, type Icon } from "@phosphor-icons/react/dist/ssr";
import type { AppLocale } from "@/lib/i18n";

export type RaidCheckStep = {
  icon: Icon;
  label: string;
  text: string;
  tone: "blue" | "gold" | "green";
};

export function getRaidCheckSteps(locale: AppLocale): RaidCheckStep[] {
  return [
    {
      icon: ClipboardTextIcon,
      label: locale === "ru" ? "Быстрое создание" : "Quick setup",
      text: locale === "ru" ? "Вставьте строку из аддона и получите результат за секунды." : "Paste your addon string and get results in seconds.",
      tone: "green",
    },
    {
      icon: ShieldCheckIcon,
      label: locale === "ru" ? "Актуальные данные" : "Up-to-date data",
      text: locale === "ru" ? "Проверка через Blizzard API в реальном времени." : "Live checks through the Blizzard API.",
      tone: "blue",
    },
    {
      icon: UsersThreeIcon,
      label: locale === "ru" ? "Полная картина" : "The full picture",
      text: locale === "ru" ? "Видите статус всех участников и потенциальные проблемы." : "See every raider’s status and potential issues.",
      tone: "gold",
    },
  ];
}
