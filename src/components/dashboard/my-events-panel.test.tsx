import React from "react";
import { render, screen } from "@testing-library/react";
import {
  MyEventsPanel,
  type DashboardScheduledEvent,
} from "@/components/dashboard/my-events-panel";

type MockImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  src: string;
};

vi.mock("next/image", async () => {
  const ReactModule = await import("react");

  return {
    default: (props: MockImageProps) => {
      const imageProps = { ...props };
      delete imageProps.fill;

      return ReactModule.createElement("img", imageProps);
    },
  };
});

function scheduledEvent(): DashboardScheduledEvent {
  return {
    activityType: "RAID",
    activities: [
      {
        activity: {
          artPath: "/raids/march_on_queldanas_styled_16x9.png",
          nameEn: "March on Quel'Danas",
          nameRu: "Марш на Кель'Данас",
        },
      },
      {
        activity: {
          artPath: "/raids/the_voidspire_styled_16x9.png",
          nameEn: "The Voidspire",
          nameRu: "Шпиль Бездны",
        },
      },
    ],
    damageMax: 12,
    damageMin: 10,
    difficulty: {
      labelEn: "Heroic",
      labelRu: "Героик",
    },
    hasPaidSlots: true,
    hasUnroll: true,
    healerMax: 5,
    healerMin: 4,
    id: "event-1",
    leaderName: "Avayn",
    leaderRealm: "Tarren Mill",
    localDate: "2026-06-29",
    localTime: "20:30",
    paidSlotPrice: 50000,
    paidSlots: 2,
    publishTargets: ["APP", "DISCORD"],
    tankMax: 2,
    tankMin: 2,
    timeZone: "Europe/Moscow",
    unrollItemIds: ["249343", "249344"],
    unrollTemplateId: "cloth",
  } as unknown as DashboardScheduledEvent;
}

describe("MyEventsPanel", () => {
  it("shows an empty state when there are no events", () => {
    render(<MyEventsPanel events={[]} locale="ru" />);

    expect(screen.getByText("Событий пока нет")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Создать событие" })) {
      expect(link).toHaveAttribute("href", "/events/new");
    }
  });

  it("renders a saved event with multiple activities", () => {
    render(<MyEventsPanel events={[scheduledEvent()]} locale="ru" />);

    expect(
      screen.getByText("Марш на Кель'Данас, Шпиль Бездны"),
    ).toBeInTheDocument();
    expect(screen.getByText("Героик")).toBeInTheDocument();
    expect(screen.getByText(/29\.06\.2026 20:30 Europe\/Moscow/)).toBeInTheDocument();
    expect(screen.getByText(/Лидер: Avayn-Tarren Mill/)).toBeInTheDocument();
    expect(screen.getByText(/Танки 2/)).toBeInTheDocument();
    expect(screen.getByText("2 ID")).toBeInTheDocument();
    expect(screen.getByText("Сайт, Discord")).toBeInTheDocument();
  });
});
