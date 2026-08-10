import { TZDate } from "@date-fns/tz";

export const DEFAULT_EVENT_TIME_ZONE = "Europe/Moscow";

export type ParsedEventDateTime = {
  localDate: string;
  localTime: string;
  startsAt: Date;
  timeZone: string;
};

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function parseEventDateTime(
  dateValue: string,
  timeValue: string,
  timeZone: string,
): ParsedEventDateTime | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);

  if (!dateMatch || !timeMatch || !isValidTimeZone(timeZone)) {
    return null;
  }

  const year = Number.parseInt(dateMatch[1], 10);
  const month = Number.parseInt(dateMatch[2], 10);
  const day = Number.parseInt(dateMatch[3], 10);
  const hour = Number.parseInt(timeMatch[1], 10);
  const minute = Number.parseInt(timeMatch[2], 10);

  if (hour > 23 || minute > 59) {
    return null;
  }

  try {
    // TZDate deliberately resolves an ambiguous fall-back time to its first
    // occurrence. The round-trip below rejects a non-existent spring-forward time.
    const zonedDate = TZDate.tz(
      timeZone,
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0,
    );

    if (
      zonedDate.getFullYear() !== year ||
      zonedDate.getMonth() !== month - 1 ||
      zonedDate.getDate() !== day ||
      zonedDate.getHours() !== hour ||
      zonedDate.getMinutes() !== minute
    ) {
      return null;
    }

    return {
      localDate: dateValue,
      localTime: timeValue,
      startsAt: new Date(zonedDate.getTime()),
      timeZone,
    };
  } catch {
    return null;
  }
}

export function toDateInputInTimeZone(
  value: Date,
  timeZone = DEFAULT_EVENT_TIME_ZONE,
) {
  const zonedDate = TZDate.tz(timeZone, value);
  const year = zonedDate.getFullYear();
  const month = String(zonedDate.getMonth() + 1).padStart(2, "0");
  const day = String(zonedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTomorrowInputDate(
  timeZone = DEFAULT_EVENT_TIME_ZONE,
  now = new Date(),
) {
  const zonedDate = TZDate.tz(timeZone, now);
  zonedDate.setDate(zonedDate.getDate() + 1);
  return toDateInputInTimeZone(zonedDate, timeZone);
}

export function formatInTimeZone(
  value: Date,
  timeZone: string,
  locale: string,
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
  }).format(value);
}
