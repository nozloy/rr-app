import Image from "next/image";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { t, type AppLocale } from "@/lib/i18n";

export function RaidCheckSubmit({ locale, disabled, pending }: { locale: AppLocale; disabled: boolean; pending: boolean }) {
  return (
    <Button className="raid-workshop-submit" disabled={disabled || pending} type="submit" aria-busy={pending}>
      <Image className="raid-workshop-submit-frame" src="/raidcheck/workshop/submit-button-frame-v2.webp" alt="" width={2172} height={724} sizes="(max-width: 700px) 90vw, 560px" quality={95} />
      <span className="raid-workshop-submit-gear" aria-hidden="true">
        <Image src="/raidcheck/workshop/submit-button-gear-v2.webp" alt="" width={1254} height={1254} sizes="(max-width: 700px) 16vw, 100px" quality={95} />
      </span>
      <span className="raid-workshop-submit-label">{pending ? (locale === "ru" ? "Проверяем…" : "Checking…") : t(locale, "raidcheck.submit")}</span>
      <span className="raid-workshop-submit-arrow [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" aria-hidden="true">
        <CaretRightIcon weight="bold" data-icon="inline-end" />
      </span>
    </Button>
  );
}
