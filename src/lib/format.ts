/**
 * All instants are ISO 8601 strings. Display is pinned to Asia/Bangkok so
 * server rendering (UTC host clock) and client hydration render identically.
 */
export const BANGKOK_TZ = "Asia/Bangkok";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: BANGKOK_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: BANGKOK_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: BANGKOK_TZ,
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

const hourFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: BANGKOK_TZ,
  hour: "numeric",
  hourCycle: "h23",
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: BANGKOK_TZ,
  weekday: "short",
});

/** Calendar day of an instant in Bangkok, as `YYYY-MM-DD`. */
export function bangkokDayKey(instant: string | Date): string {
  return dayKeyFmt.format(typeof instant === "string" ? new Date(instant) : instant);
}

/** Day of week (0=Sun..6=Sat) of an instant in Bangkok. */
export function bangkokWeekday(instant: string | Date): number {
  return WEEKDAYS.indexOf(
    weekdayFmt.format(typeof instant === "string" ? new Date(instant) : instant),
  );
}

/** Hour of day (0-23) of an instant in Bangkok. */
export function bangkokHour(instant: string | Date): number {
  return Number(
    hourFmt.format(typeof instant === "string" ? new Date(instant) : instant),
  ) % 24;
}

/** Bangkok calendar day `offset` days from today (fractional days ignored). */
export function daysFromToday(offset: number): string {
  return bangkokDayKey(new Date(Date.now() + offset * 86_400_000));
}

/** Builds an ISO instant from date (`YYYY-MM-DD`) and time (`HH:mm`) inputs. */
export function toBangkokIso(date: string, time: string): string {
  return `${date}T${time}:00+07:00`;
}

export function isPast(iso: string, now = Date.now()): boolean {
  return new Date(iso).getTime() < now;
}

export function formatDay(iso: string): string {
  const key = bangkokDayKey(iso);
  if (key === daysFromToday(0)) return "Today";
  if (key === daysFromToday(1)) return "Tomorrow";
  return dayFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatWhen(iso: string): string {
  return `${formatDay(iso)} · ${formatTime(iso)}`;
}

export function formatBudget(amount: number): string {
  if (amount === 0) return "Free";
  return `฿${amount.toLocaleString("en-US")}`;
}

export function formatBudgetPerPerson(amount: number | null): string {
  if (amount === null || amount === 0) return "Free";
  return `≈ ฿${amount.toLocaleString("en-US")}/person`;
}

/**
 * Mock profiles showed "Year 3"; the DB `enrolment_year` is a smallint whose
 * real-world meaning is unverified — only render values plausibly denoting an
 * academic year, hide anything else.
 */
export function formatEnrolmentYear(year: number | null): string | null {
  if (year === null || year < 1 || year > 9) return null;
  return `Year ${year}`;
}

export function spotsLeft(
  maxSlots: number | null,
  acceptedCount: number,
): number {
  if (maxSlots === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, maxSlots - acceptedCount);
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

export function formatMessageTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}
