import { raidCheckSteps } from "@/components/raidcheck/data";
import { Card, CardContent } from "@/components/ui/card";

export function RaidCheckProcess() {
  return (
    <section className="raidcheck-process" aria-label="Как работает проверка">
      {raidCheckSteps.map((step) => {
        const Icon = step.icon;

        return (
          <Card className="raidcheck-process-card" data-tone={step.tone} key={step.label}>
            <CardContent className="raidcheck-process-content">
              <span className="raidcheck-process-icon">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2>{step.label}</h2>
                <p>{step.text}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
