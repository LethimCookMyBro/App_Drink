"use client";

const adminNumberFormatter = new Intl.NumberFormat("th-TH");
const adminTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatAdminNumber(value: number): string {
  return adminNumberFormatter.format(value);
}

export function formatAdminDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("th-TH");
}

export function formatAdminTime(value: Date | null): string {
  if (!value) return "-";
  return adminTimeFormatter.format(value);
}
