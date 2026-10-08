import { MoonStars } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FortuneRoster } from "@/components/kogda-raid/fortune-roster";
import { FORECAST_TARGETS, FORECAST_TIME_ZONE, type RaidForecast, type RaidForecastCharacter, type RaidForecastDifficulty } from "@/lib/raid-forecast-core";

const quotes: Record<RaidForecast["reason"], string> = {
  available: "Звёзды благоволят! Похоже, герои снова соберутся.",
  evening: "Сумерки сгущаются. Звёзды пока не спешат раскрывать свои планы.",
  outside_hours: "Даже героям нужен отдых. Возвращайся, когда ярмарка проснётся.",
  all_locked: "Карты притихли. Судьба приберегла приключения на другой день.",
  unknown: "Туман скрывает судьбу. Загляни в шар чуть позже.",
};
const clock = new Intl.DateTimeFormat("ru-RU", { timeZone: FORECAST_TIME_ZONE, hour: "2-digit", minute: "2-digit" });

export function FortunePanel({ difficulty, forecast, characters, now, checkedAt, loading, error }: {
  difficulty: RaidForecastDifficulty;
  forecast: RaidForecast;
  characters: RaidForecastCharacter[];
  now: Date;
  checkedAt: string | null;
  loading: boolean;
  error: string | null;
}) {
  const chance = loading ? null : forecast.chance;
  const tone = chance === null ? "unknown" : chance >= 70 ? "high" : chance >= 30 ? "medium" : "low";
  const title = loading ? "Шар пробуждается" : "Шар затуманен";
  return (
    <section className="darkmoon-parchment relative mx-auto w-full min-w-0 max-w-[490px]" data-tone={tone} aria-label="Предсказание рейда">
      <div className="darkmoon-parchment-seal absolute -top-6 left-1/2 z-10 grid size-12 -translate-x-1/2 place-items-center rounded-full" aria-hidden="true"><MoonStars size={28} weight="fill" /></div>
      <Card className="relative border-0 shadow-none">
        <CardHeader className="items-center space-y-0 gap-2 px-5 pb-0 pt-8 text-center sm:px-7" role="status" aria-live="polite" aria-atomic="true">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{FORECAST_TARGETS[difficulty].label}</p>
          <CardTitle role="heading" aria-level={2} className="flex flex-wrap items-baseline justify-center gap-x-2 font-serif text-[22px] leading-tight sm:text-[28px]">
            {chance === null ? <span className="darkmoon-chance">{title}</span> : <><span>Шанс рейда:</span><span className="darkmoon-chance text-4xl tabular-nums sm:text-[44px]" aria-label={`${chance}% — шанс начала рейда сейчас`}>{chance}%</span></>}
          </CardTitle>
          <CardDescription className="text-foreground">{loading ? "Сверяем звёзды и недельные КД…" : <>Без КД: <strong>{forecast.freeCount}</strong> из {characters.length} персонажей</>}</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-4 sm:px-7">
          <div className="darkmoon-divider my-3 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1" /><span>✧ ☾ ✧</span><span className="h-px flex-1" /></div>
          <blockquote className="mb-4 min-h-10 text-center font-serif text-[15px] italic leading-snug">
            <span className="font-bold">Сайдж говорит: </span>«{loading ? "Подойди ближе. Шар вот-вот откроет свою тайну…" : quotes[forecast.reason]}»
          </blockquote>
          {error && <Alert className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          {!loading && forecast.unknownCount > 0 && !error && <p className="mb-3 text-center text-xs text-muted-foreground">Не удалось проверить: {forecast.unknownCount}. Их КД пока неизвестны.</p>}
          <FortuneRoster difficulty={difficulty} characters={characters} loading={loading} />
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-2 px-5 pb-5 sm:px-7">
          <span className="text-[10px] text-muted-foreground">{checkedAt ? `Обновлено в ${clock.format(new Date(checkedAt))} МСК` : "Сайдж всматривается в шар"}</span>
          <span className="text-[10px] text-muted-foreground">Сейчас {clock.format(now)} МСК</span>
        </CardFooter>
      </Card>
    </section>
  );
}
