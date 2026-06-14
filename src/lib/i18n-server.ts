import { cookies, headers } from "next/headers";
import { APP_LOCALE_COOKIE, type AppLocale, resolveAppLocale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return resolveAppLocale({
    cookieLocale: cookieStore.get(APP_LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
}

function getCookieFromHeader(rawCookie: string, key: string) {
  const chunks = rawCookie.split(";").map((chunk) => chunk.trim());

  for (const chunk of chunks) {
    const [name, ...rest] = chunk.split("=");

    if (name === key) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export function getLocaleFromRequest(request: Request): AppLocale {
  const cookieLocale = getCookieFromHeader(
    request.headers.get("cookie") ?? "",
    APP_LOCALE_COOKIE,
  );

  return resolveAppLocale({
    cookieLocale,
    acceptLanguage: request.headers.get("accept-language"),
  });
}

