import { ChartBarIcon, SwordIcon, TreasureChestIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { getWorkshopCopy } from "@/components/home/workshop-copy";
import type { AppLocale } from "@/lib/i18n";

const icons = [UsersThreeIcon, ChartBarIcon, TreasureChestIcon, SwordIcon];

export function WorkshopFeatures({ locale }: { locale: AppLocale }) {
  const copy = getWorkshopCopy(locale);

  return (
    <section className="workshop-features" aria-label={copy.benefits}>
      {copy.features.map((feature, index) => {
        const Icon = icons[index];

        return (
          <article className="workshop-feature" key={feature.title}>
            <Icon weight="fill" aria-hidden="true" />
            <h2>{feature.title}</h2>
            <p>{feature.lines[0]}<br />{feature.lines[1]}</p>
          </article>
        );
      })}
    </section>
  );
}
