import { getRaidCheckSteps } from "@/components/raidcheck/data";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppLocale } from "@/lib/i18n";

export function RaidCheckProcess({ locale }: { locale: AppLocale }) {
  const raidCheckSteps = getRaidCheckSteps(locale);

  return (
    <section className="raidcheck-process" aria-label={locale === "ru" ? "Как работает проверка" : "How check works"}>
      {raidCheckSteps.map((step) => (
        <Card className="raidcheck-process-card raid-workshop-metal" key={step.label}>
          <CardHeader className="raidcheck-process-content">
            <span
              className="raidcheck-process-icon"
              style={{ backgroundImage: `url(${step.iconSrc})` }}
              aria-hidden="true"
            />
            <div>
              <CardTitle>{step.label}</CardTitle>
              <CardDescription>{step.text}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}
