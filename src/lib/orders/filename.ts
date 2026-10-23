import type { OrderStatus } from "./params";

export function csvFilename(status: OrderStatus | null, now: Date = new Date()): string {
  const day = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }); // AAAA-MM-DD
  return `pedidos-${status ? `${status}-` : ""}${day}.csv`;
}
