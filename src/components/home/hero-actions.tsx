import Link from "next/link";
import Image from "next/image";
import { WorkshopActionContent } from "@/components/home/workshop-action-content";
import { getWorkshopCopy } from "@/components/home/workshop-copy";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n";

export function HeroActions({ locale }: { locale: AppLocale }) {
  const copy = getWorkshopCopy(locale);

  return (
    <section className="workshop-actions" id="tools" aria-label={copy.tools} tabIndex={-1}>
      <Button asChild variant="ghost" className="workshop-action workshop-action-check">
        <Link href="/raidcheck" aria-label={copy.check}>
          <Image src="/home/workshop/check-button.webp" alt="" width={1774} height={887} priority unoptimized aria-hidden="true" />
          <WorkshopActionContent label={copy.check} locale={locale} />
        </Link>
      </Button>
      <Button asChild variant="ghost" className="workshop-action workshop-action-forecast">
        <Link href="/kogda-raid" aria-label={copy.forecast}>
          <Image src="/home/workshop/forecast-button.webp" alt="" width={1774} height={887} priority unoptimized aria-hidden="true" />
          <WorkshopActionContent label={copy.forecast} locale={locale} />
        </Link>
      </Button>
    </section>
  );
}
