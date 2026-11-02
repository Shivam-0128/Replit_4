export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = err as { data?: { error?: unknown } | null; message?: string } | null;
  if (e && e.data && typeof e.data.error === "string") return e.data.error;
  return fallback;
}

export function isUnauthorized(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 401;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function lastSevenDays(): { key: string; weekday: string; isToday: boolean }[] {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push({
      key: localDateKey(d),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      isToday: i === 0,
    });
  }
  return out;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
