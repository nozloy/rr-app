import Image from "next/image";
import { t, type AppLocale } from "@/lib/i18n";

export function RaidCheckHero({ locale }: { locale: AppLocale }) {
  return (
    <section className="raidcheck-hero" aria-labelledby="raidcheck-title">
      <Image
        src="/home/hero-midnight-citadel.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="raidcheck-hero-bg"
      />
      <div className="raidcheck-hero-overlay" aria-hidden="true" />

      <div className="raidcheck-hero-content">
        <div className="eyebrow">{t(locale, "raidcheck.heroEyebrow")}</div>
        <h1 id="raidcheck-title">{t(locale, "raidcheck.title")}</h1>
        <p>{t(locale, "raidcheck.heroCopy")}</p>
      </div>
    </section>
  );
}
