import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  title: "Рейдовая мастерская — RaidReminder",
  description: "Готовь рейд. Проверяй. Побеждай. Анализ состава, проверка экипировки и предсказания для твоего рейда в World of Warcraft.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  return <HomePage />;
}
