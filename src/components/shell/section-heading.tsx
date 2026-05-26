import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  action?: ReactNode;
  className?: string;
  icon?: LucideIcon;
  title: ReactNode;
  titleClassName?: string;
};

export function SectionHeading({
  action,
  className,
  icon: Icon,
  title,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <div className={cn("home-section-heading", className)}>
      <div className={cn("home-section-title", titleClassName)}>
        {Icon ? <Icon className="size-7" aria-hidden="true" /> : null}
        <h2>{title}</h2>
      </div>
      {action ? <div className="home-section-action">{action}</div> : null}
    </div>
  );
}
