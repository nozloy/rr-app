import { getRaidCheckSteps } from "@/components/raidcheck/data";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppLocale } from "@/lib/i18n";

export function RaidCheckProcess({ locale }: { locale: AppLocale }) {
  const raidCheckSteps = getRaidCheckSteps(locale);

  return (
    <section className="raidcheck-process" aria-label={locale === "ru" ? "Как работает проверка" : "How check works"}>
      {raidCheckSteps.map((step) => {
        const Icon = step.icon;

        return (
          <Card className="raidcheck-process-card raid-workshop-metal" data-tone={step.tone} key={step.label}>
            <CardHeader className="raidcheck-process-content">
              <span className="raidcheck-process-icon">
                <Icon weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>{step.label}</CardTitle>
                <CardDescription>{step.text}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </section>
  );
}
