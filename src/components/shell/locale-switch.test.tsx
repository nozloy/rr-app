import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/shell/locale-provider";
import * as localeSwitchModule from "@/components/shell/locale-switch";

describe("LocaleSwitch", () => {
  it("writes locale cookie and reloads page when toggled", () => {
    const reloadSpy = vi
      .spyOn(localeSwitchModule.localeSwitchRuntime, "reload")
      .mockImplementation(() => undefined);

    document.cookie =
      "rr_locale=ru; Path=/; Max-Age=3600; SameSite=Lax";

    render(
      <LocaleProvider locale="ru">
        <localeSwitchModule.LocaleSwitch />
      </LocaleProvider>,
    );

    const switchControl = screen.getByRole("switch");
    fireEvent.click(switchControl);

    expect(document.cookie).toContain("rr_locale=en");
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    reloadSpy.mockRestore();
  });
});
