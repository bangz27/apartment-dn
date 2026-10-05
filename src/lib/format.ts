const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function baht(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท`;
}

export function meterText(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("th-TH", { maximumFractionDigits: 2 }) : "0";
}

export function thaiMonth(ym: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return ym;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return ym;
  return `${MONTHS[month - 1]} ${year + 543}`;
}

export function currentMonthBangkok(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  return parts.slice(0, 7);
}

export function statusLabel(status: string): string {
  if (status === "paid") return "ชำระแล้ว";
  if (status === "cancelled") return "ยกเลิก";
  return "ค้างชำระ";
}
