export function combineDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
}

export function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toDateKey(d);
}

export function isPast(partyDate: string, partyTime: string, now = new Date()): boolean {
  return combineDateTime(partyDate, partyTime).getTime() < now.getTime();
}

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

export function formatDay(date: string): string {
  const d = combineDateTime(date, "12:00");
  const today = toDateKey(new Date());
  const tomorrow = daysFromToday(1);
  if (date === today) return "Today";
  if (date === tomorrow) return "Tomorrow";
  return dayFmt.format(d);
}

export function formatTime(time: string): string {
  return timeFmt.format(combineDateTime("2000-01-01", time));
}

export function formatWhen(date: string, time: string): string {
  return `${formatDay(date)} · ${formatTime(time)}`;
}

export function formatBudget(amount: number): string {
  if (amount === 0) return "Free";
  return `฿${amount.toLocaleString("en-US")}`;
}

export function formatBudgetPerPerson(amount: number): string {
  if (amount === 0) return "Free";
  return `≈ ฿${amount.toLocaleString("en-US")}/person`;
}

export function spotsLeft(
  partyCapacity: number | null,
  acceptedCount: number
): number {
  if (partyCapacity === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, partyCapacity - acceptedCount);
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

export function formatMessageTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function relativeToNow(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
