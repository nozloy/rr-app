import { featureTiles } from "@/components/home/data";

export function FeatureTiles() {
  return (
    <section className="home-feature-grid" id="features" aria-label="Преимущества">
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
