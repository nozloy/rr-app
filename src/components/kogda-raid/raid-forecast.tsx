"use client";

import { FortunePanel } from "@/components/kogda-raid/fortune-panel";
import { FortuneScene } from "@/components/kogda-raid/fortune-scene";
import { useRaidForecast } from "@/components/kogda-raid/use-raid-forecast";

export function RaidForecastExperience({ initialServerNow }: { initialServerNow: string }) {
  const state = useRaidForecast(initialServerNow);
  return (
    <div className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pt-10 pb-10 sm:px-8 sm:pt-12">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-8">
        <FortuneScene loading={state.initialLoading} reveal={state.reveal} buttonLabel={state.buttonLabel} onToggleDifficulty={state.toggleDifficulty} />
        <FortunePanel difficulty={state.difficulty} forecast={state.forecast} characters={state.characters} now={state.now} checkedAt={state.checkedAt} loading={state.initialLoading} error={state.error} />
      </div>
    </div>
  );
}
