import {
  ClipboardCheck,
  type LucideIcon,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

export type RaidCheckStep = {
  icon: LucideIcon;
  label: string;
  text: string;
  tone: "blue" | "gold" | "green";
};

export const raidCheckSteps: RaidCheckStep[] = [
  {
    icon: ClipboardCheck,
    label: "Экспорт состава",
    text: "Скопируйте строку из аддона прямо перед пуллом или сбором.",
    tone: "blue",
  },
  {
    icon: SearchCheck,
    label: "Проверка через API",
    text: "Сервер сверяет каждого участника с рейдовыми убийствами недели.",
    tone: "green",
  },
  {
    icon: ShieldCheck,
    label: "Решение по слоту",
    text: "Лидер сразу видит чистых игроков, ошибки и занятые кд.",
    tone: "gold",
  },
];
