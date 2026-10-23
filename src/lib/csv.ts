// CSV pensado para Excel en español: separador ';', decimal ',', BOM UTF-8 y CRLF.

export const CSV_BOM = "﻿";

export function csvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function csvLine(fields: string[]): string {
  return fields.map(csvField).join(";") + "\r\n";
}

/** Evita que Excel ejecute como fórmula texto introducido por terceros. */
export function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function formatDecimalEs(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDateEs(iso: string): string {
  const p = Object.fromEntries(dateFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
