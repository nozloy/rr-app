import Image from "next/image";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { t, type AppLocale } from "@/lib/i18n";

export function RaidCheckEmpty({ locale, pending }: { locale: AppLocale; pending: boolean }) {
  return (
    <Empty className="raid-workshop-empty" role="status" aria-live="polite">
      <EmptyHeader>
        <EmptyMedia className="raid-workshop-tools" aria-hidden="true">
          <Image src="/raidcheck/workshop/ready-emblem.webp" alt="" width={1254} height={1254} sizes="140px" quality={95} />
          {pending ? <CircleNotchIcon className="raid-workshop-spinner animate-spin" /> : null}
        </EmptyMedia>
        <EmptyTitle><h3>{pending ? (locale === "ru" ? "Проверяем состав" : "Checking your roster") : t(locale, "raidcheck.readyToCheck")}</h3></EmptyTitle>
        <EmptyDescription>{pending ? (locale === "ru" ? "Получаем данные участников рейда. Это может занять некоторое время." : "Fetching data for your raiders. This may take a moment.") : t(locale, "raidcheck.readyToCheckCopy")}</EmptyDescription>
      </EmptyHeader>
      <p className="raid-workshop-graffiti" aria-hidden="true">{locale === "ru" ? <>Меньше ожидания<br />Больше побед!</> : <>Less waiting<br />More victories!</>}</p>
    </Empty>
  );
}
