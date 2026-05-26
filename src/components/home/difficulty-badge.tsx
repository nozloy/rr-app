import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DifficultyBadgeProps = {
  value: string;
};

const difficultyClasses: Record<string, string> = {
  LFR: "home-difficulty-lfr",
  NORMAL: "home-difficulty-normal",
  HEROIC: "home-difficulty-heroic",
  MYTHIC: "home-difficulty-mythic",
};

export function DifficultyBadge({ value }: DifficultyBadgeProps) {
  return (
    <Badge className={cn("home-difficulty-badge", difficultyClasses[value])} variant="outline">
      {value}
    </Badge>
  );
}
