import type { OrderStatus } from "./params";

export function ordersHref({ status, page }: { status: OrderStatus | null; page: number }): string {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (page > 1) q.set("page", String(page));
  const qs = q.toString();
  return qs ? `/orders?${qs}` : "/orders";
}

/** El CSV exporta el conjunto filtrado completo: lleva el estado pero nunca la página. */
export function exportHref({ status }: { status: OrderStatus | null }): string {
  return status ? `/orders/export?status=${status}` : "/orders/export";
}
