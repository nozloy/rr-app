import React from "react";
import { render, screen } from "@testing-library/react";
import {
  ProfileEvents,
  splitProfileEvents,
  type ProfileScheduledEvent,
} from "@/components/profile/profile-events";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function event(id: string, startsAt: string): ProfileScheduledEvent {
  return {
    activities: [
      {
        activity: {
          artPath: "/raids/the_voidspire_styled_16x9.png",
          nameEn: `Event ${id}`,
          nameRu: `Событие ${id}`,
        },
      },
    ],
    activityType: "RAID",
    damageMax: 12,
    damageMin: 10,
    difficulty: { labelEn: "Heroic", labelRu: "Героик" },
    deliveries: [],
    healerMax: 5,
    healerMin: 4,
    id,
    leaderName: "Avayn",
    leaderRealm: "Tarren Mill",
    localDate: startsAt.slice(0, 10),
    localTime: "20:30",
    publishTargets: ["APP", "DISCORD"],
    status: "PUBLISHED",
    startsAt: new Date(startsAt),
    tankMax: 2,
    tankMin: 2,
    timeZone: "Europe/Moscow",
    version: 1,
  } as unknown as ProfileScheduledEvent;
}

describe("ProfileEvents", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");

  it("shows the account empty state", () => {
    render(<ProfileEvents events={[]} locale="ru" now={now} />);

    expect(screen.getByText("Событий пока нет")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Создать событие" })[0]).toHaveAttribute(
      "href",
      "/events/new",
    );
  });

  it("sorts upcoming ascending and past descending", () => {
    const events = [
      event("past-old", "2026-08-08T12:00:00.000Z"),
      event("future-late", "2026-08-12T12:00:00.000Z"),
      event("past-new", "2026-08-09T12:00:00.000Z"),
      event("future-near", "2026-08-11T12:00:00.000Z"),
    ];

    const grouped = splitProfileEvents(events, now);

    expect(grouped.upcoming.map(({ id }) => id)).toEqual([
      "future-near",
      "future-late",
    ]);
    expect(grouped.past.map(({ id }) => id)).toEqual(["past-new", "past-old"]);
  });

  it("keeps a cancelled future event in history instead of upcoming", () => {
    const cancelled = {
      ...event("cancelled", "2026-08-12T12:00:00.000Z"),
      status: "CANCELLED" as const,
    };

    const grouped = splitProfileEvents([cancelled], now);

    expect(grouped.upcoming).toEqual([]);
    expect(grouped.past.map(({ id }) => id)).toEqual(["cancelled"]);
  });

  it("shows an upcoming empty state when only past events exist", () => {
    render(
      <ProfileEvents
        events={[event("past", "2026-08-09T12:00:00.000Z")]}
        locale="ru"
        now={now}
      />,
    );

    expect(screen.getByText("Нет ближайших событий")).toBeInTheDocument();
    expect(screen.getByText("Прошедшие")).toBeInTheDocument();
    expect(screen.getByText("Событие past")).toBeInTheDocument();
  });
});
