import { Search, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroActions() {
  return (
    <div className="home-hero-actions" aria-label="Демо действия">
      <Button className="home-primary-action" size="lg" type="button">
        <Swords className="size-5" aria-hidden="true" />
        Создать сбор
      </Button>
      <Button className="home-secondary-action" size="lg" type="button" variant="outline">
        <Search className="size-5" aria-hidden="true" />
        Найти группу
      </Button>
    </div>
  );
}
