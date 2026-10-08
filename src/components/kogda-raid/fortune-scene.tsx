import Image from "next/image";
import { CircleNotch, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function FortuneScene({ loading, reveal, buttonLabel, onToggleDifficulty }: {
  loading: boolean;
  reveal: number;
  buttonLabel: string;
  onToggleDifficulty: () => void;
}) {
  return (
    <section className="relative flex min-w-0 flex-col items-center justify-end" aria-label="Предсказатель Сайдж">
      <div className="relative isolate -mx-4 -mb-5 w-[calc(100%+2rem)] max-w-[680px] sm:-mx-8 sm:w-[calc(100%+4rem)] lg:-mt-8">
        <div className="darkmoon-oracle-halo absolute inset-x-[12%] top-[18%] h-[65%]" aria-hidden="true" />
        <Image src="/kogda-raid/sayge-oracle-reference.png" alt="Сайдж в оранжевом капюшоне, с черепом на плече, гадает над сияющим фиолетовым шаром" width={1402} height={1122} priority sizes="(min-width: 1024px) 680px, (min-width: 640px) 680px, 100vw" className="relative z-10 mx-auto h-auto w-full object-contain object-bottom" />
        {reveal > 0 && <div key={reveal} className="darkmoon-reveal pointer-events-none absolute inset-x-[29%] top-[43%] z-20 aspect-square rounded-full" aria-hidden="true" />}
        <span className="darkmoon-spark absolute left-[15%] top-[50%] z-20" aria-hidden="true">✦</span>
        <span className="darkmoon-spark darkmoon-spark-delayed absolute right-[13%] top-[33%] z-20" aria-hidden="true">✧</span>
      </div>
      <div className="relative z-30 flex w-full max-w-[410px] flex-col items-center gap-3 px-3">
        <div className="darkmoon-button-frame w-full p-[3px]">
          <Button onClick={onToggleDifficulty} disabled={loading} aria-busy={loading} size="lg" className="h-auto min-h-14 w-full rounded-none px-3 py-3" aria-describedby="fortune-button-hint">
            {loading ? <CircleNotch data-icon="inline-start" className="motion-safe:animate-spin" aria-hidden="true" /> : <Sparkle data-icon="inline-start" weight="fill" aria-hidden="true" />}
            <span className="min-w-0 text-center font-serif text-lg font-bold whitespace-normal sm:text-xl">{loading ? "Вглядываемся в будущее…" : buttonLabel}</span>
          </Button>
        </div>
        <p id="fortune-button-hint" className="text-center text-xs text-muted-foreground">Загляни в будущее… если осмелишься.</p>
      </div>
    </section>
  );
}
