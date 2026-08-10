import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventOwnerActions } from "@/components/events/event-owner-actions";

const { refreshMock, retryMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  retryMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/actions/events", () => ({
  cancelScheduledEventAction: vi.fn(),
  retryScheduledEventDeliveryAction: retryMock,
}));

describe("EventOwnerActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries a failed external delivery", async () => {
    const user = userEvent.setup();
    retryMock.mockResolvedValue({
      deliveries: [],
      eventId: "event-1",
      message: "Публикация обновлена.",
      status: "success",
      version: 1,
      warnings: [],
    });

    render(
      <EventOwnerActions
        canEdit={false}
        compact
        deliveries={[
          {
            lastAttemptAt: "2026-08-10T10:00:00.000Z",
            lastErrorMessage: "Discord вернул ошибку 500.",
            status: "FAILED",
            target: "DISCORD",
          },
        ]}
        eventId="event-1"
        isCancelled={false}
        version={1}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    await waitFor(() => {
      expect(retryMock).toHaveBeenCalledWith({
        eventId: "event-1",
        target: "DISCORD",
      });
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("makes a stale pending attempt available for manual retry", () => {
    render(
      <EventOwnerActions
        canEdit={false}
        compact
        deliveries={[
          {
            lastAttemptAt: "2020-01-01T00:00:00.000Z",
            lastErrorMessage: null,
            status: "PENDING",
            target: "TELEGRAM",
          },
        ]}
        eventId="event-1"
        isCancelled={false}
        version={1}
      />,
    );

    expect(screen.getByText("Попытка зависла")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
  });
});
