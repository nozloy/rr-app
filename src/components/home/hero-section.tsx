import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function HeroSection({ locale }: { locale: AppLocale }) {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-copy">
        <h1 id="home-hero-title">
          {t(locale, "home.heroTitleLine1")}
          <br />
          {t(locale, "home.heroTitleLine2")}
        </h1>
        <p>{t(locale, "home.heroCopy")}</p>
      </div>
    </section>
  );
}
