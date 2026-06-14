import { getFeatureTiles } from "@/components/home/data";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function FeatureTiles({ locale }: { locale: AppLocale }) {
  const featureTiles = getFeatureTiles(locale);

  return (
    <section className="home-feature-grid" id="features" aria-label={t(locale, "home.featuresAria")}>
      {featureTiles.map((feature) => {
        const Icon = feature.icon;

        return (
          <article className="home-feature-tile" data-tone={feature.tone} key={feature.title}>
            <Icon className="size-10" aria-hidden="true" />
            <div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
