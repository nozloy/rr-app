import { Search } from "lucide-react";
import { homeFilters } from "@/components/home/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function FilterBar() {
  return (
    <section className="home-filter-bar" id="filters" aria-label="Фильтры событий">
      {homeFilters.map((filter) => {
        const Icon = filter.icon;
        const selectedLabel =
          filter.options.find((option) => option.value === filter.value)?.label ??
          filter.options[0]?.label;

        return (
          <div className="home-filter-field" key={filter.label}>
            <Icon className="home-filter-icon" aria-hidden="true" />
            <div className="home-filter-copy">
              <span>{filter.label}</span>
              <Select defaultValue={filter.value}>
                <SelectTrigger aria-label={filter.label} className="home-select-trigger">
                  <span className="home-filter-selected">{selectedLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}

      <label className="home-search-field">
        <Search className="size-7" aria-hidden="true" />
        <span className="sr-only">Поиск по названию</span>
        <Input placeholder="Поиск по названию..." />
      </label>
    </section>
  );
}
