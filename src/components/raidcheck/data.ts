import type { AppLocale } from "@/lib/i18n";

export type RaidCheckStep = {
  iconSrc: string;
  label: string;
  text: string;
};

export function getRaidCheckSteps(locale: AppLocale): RaidCheckStep[] {
  return [
    {
      iconSrc: "/raidcheck/workshop/process-blizzard-api.webp",
      label: locale === "ru" ? "Проверяем по Blizzard API" : "Checking the Blizzard API",
      text: locale === "ru" ? "Сверяем экипировку, прогресс и КД участников." : "Check every raider’s gear, progress and lockouts.",
    },
    {
      iconSrc: "/raidcheck/workshop/process-logs.webp",
      label: locale === "ru" ? "Чекаем логи" : "Checking the logs",
      text: locale === "ru" ? "Смотрим Warcraft Logs и оцениваем опыт участников." : "Review Warcraft Logs and each raider’s experience.",
    },
    {
      iconSrc: "/raidcheck/workshop/process-kick.webp",
      label: locale === "ru" ? "Кикаем недостойных" : "Kicking the unworthy",
      text: locale === "ru" ? "Видно, кто готов к рейду, а кому пора на замену." : "See who is raid-ready and who needs replacing.",
    },
  ];
}
