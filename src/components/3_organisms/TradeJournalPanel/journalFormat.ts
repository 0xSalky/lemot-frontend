/** Shared formatters for trade journal display. */

export function formatR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 10_000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (abs >= 100) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (abs >= 1) {
    return value.toFixed(4);
  }
  if (abs >= 0.01) {
    return value.toFixed(5);
  }
  return value.toFixed(6);
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatShortDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatPresetLabel(raw: string | null): string {
  if (!raw) return "—";
  return raw.replace(/_/g, "·").replace(/^natr /i, "NATR ");
}
