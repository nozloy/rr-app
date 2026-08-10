import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventCatalogFilters } from "@/components/events/event-catalog-filters";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("EventCatalogFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies type, difficulty and calendar-date filters", async () => {
    const user = userEvent.setup();
    render(
      <EventCatalogFilters
        date=""
        difficulties={[{ label: "Героик", slug: "heroic" }]}
        difficulty=""
        type=""
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Тип события" }));
    await user.click(screen.getByRole("option", { name: "Подземелье" }));
    await user.click(screen.getByRole("combobox", { name: "Сложность" }));
    await user.click(screen.getByRole("option", { name: "Героик" }));
    await user.type(screen.getByLabelText("Дата события"), "2026-08-12");
    await user.click(screen.getByRole("button", { name: "Применить" }));

    expect(pushMock).toHaveBeenCalledWith(
      "/events?type=dungeon&difficulty=heroic&date=2026-08-12",
    );
  });

  it("clears all filters", async () => {
    const user = userEvent.setup();
    render(
      <EventCatalogFilters
        date="2026-08-12"
        difficulties={[{ label: "Героик", slug: "heroic" }]}
        difficulty="heroic"
        type="raid"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));

    expect(pushMock).toHaveBeenCalledWith("/events");
  });
});
