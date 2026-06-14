import {
  resolveAppLocale,
  resolveLocaleFromAcceptLanguage,
} from "@/lib/i18n";

describe("i18n locale resolver", () => {
  it("prefers cookie locale over browser language", () => {
    expect(
      resolveAppLocale({
        cookieLocale: "en",
        acceptLanguage: "ru-RU,ru;q=0.9",
      }),
    ).toBe("en");
  });

  it("uses browser language when cookie is missing", () => {
    expect(
      resolveAppLocale({
        acceptLanguage: "en-US,en;q=0.9,ru;q=0.6",
      }),
    ).toBe("en");
  });

  it("falls back to ru for unsupported values", () => {
    expect(
      resolveAppLocale({
        cookieLocale: "de",
        acceptLanguage: "de-DE,de;q=0.9",
      }),
    ).toBe("ru");
    expect(resolveLocaleFromAcceptLanguage(null)).toBe("ru");
  });
});

