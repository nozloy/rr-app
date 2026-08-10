import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ViewerLocalTime } from "@/components/events/viewer-local-time";

describe("ViewerLocalTime", () => {
  it("shows visitor-local time when it differs from the author's zone", async () => {
    render(
      <ViewerLocalTime
        authorTimeZone="UTC"
        startsAt="2026-08-12T17:30:00.000Z"
      />,
    );

    expect(await screen.findByText(/Ваше время:/)).toHaveTextContent(
      "Europe/Moscow",
    );
  });

  it("does not duplicate time when both zones match", async () => {
    render(
      <ViewerLocalTime
        authorTimeZone="Europe/Moscow"
        startsAt="2026-08-12T17:30:00.000Z"
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Ваше время:/)).not.toBeInTheDocument();
    });
  });
});
