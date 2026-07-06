export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format angka dengan titik ribuan: 16000 → "16.000" */
export function formatNumber(n: number | string): string {
  const num = typeof n === "string" ? parseInt(n) || 0 : n;
  return num.toLocaleString("id-ID");
}

/** Parse "16.000" → 16000 */
export function parseFormattedNumber(s: string): number {
  return parseInt(s.replace(/\\./g, "")) || 0;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
