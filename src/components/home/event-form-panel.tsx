import { Coins, Compass, Sparkles } from "lucide-react";
import { roleRequirements } from "@/components/home/data";
import { RoleCard } from "@/components/home/role-card";
import { SectionHeading } from "@/components/home/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EventFormPanel() {
  return (
    <aside className="home-panel home-event-panel" aria-label="Демо форма создания события">
      <SectionHeading icon={Compass} title="Создание события" />

      <div className="home-form-grid">
        <label className="home-field home-field-wide">
          <span>Название</span>
          <Input placeholder="Например, Рейд Шпиль Бездны" />
        </label>

        <label className="home-field">
          <span>Тип активности</span>
          <Select defaultValue="raid">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raid">Рейд</SelectItem>
              <SelectItem value="key">Ключ</SelectItem>
              <SelectItem value="farm">Фарм</SelectItem>
              <SelectItem value="achievement">Ачивки</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="home-field">
          <span>Дата</span>
          <Input defaultValue="25.05.2026" />
        </label>

        <label className="home-field">
          <span>Время</span>
          <Input defaultValue="20:00" />
        </label>
      </div>

      <div className="home-role-grid">
        {roleRequirements.map((role) => (
          <RoleCard key={role.label} role={role} />
        ))}
      </div>

      <label className="home-field home-cost-field">
        <span>Стоимость слота в золоте (опция)</span>
        <div className="home-cost-input">
          <Input defaultValue="25000" />
          <Coins className="size-5" aria-hidden="true" />
        </div>
      </label>

      <Button className="home-publish-button" size="lg" type="button">
        Опубликовать
        <Sparkles className="size-4" aria-hidden="true" />
      </Button>
    </aside>
  );
}
