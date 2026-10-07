import Image from "next/image";
import { CaretRightIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { t, type AppLocale } from "@/lib/i18n";

export function RaidCheckSubmit({ locale, disabled, pending }: { locale: AppLocale; disabled: boolean; pending: boolean }) {
  return (
    <Button className="raid-workshop-submit" disabled={disabled} type="submit" aria-busy={pending}>
      <Image src="/raidcheck/workshop/submit-button.webp" alt="" width={2172} height={724} sizes="(max-width: 700px) 90vw, 560px" quality={95} />
      <span className="raid-workshop-submit-label">{pending ? (locale === "ru" ? "Проверяем…" : "Checking…") : t(locale, "raidcheck.submit")}</span>
      <span className="raid-workshop-submit-arrow [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" aria-hidden="true">
        {pending ? (
          <CircleNotchIcon className="animate-spin motion-reduce:animate-none" data-icon="inline-end" />
        ) : (
          <CaretRightIcon weight="bold" data-icon="inline-end" />
        )}
      </span>
    </Button>
  );
}
