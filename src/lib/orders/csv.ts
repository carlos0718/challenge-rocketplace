import { CSV_BOM, csvLine, formatDateEs, formatDecimalEs, safeText } from "@/lib/csv";
import type { OrderStatus } from "./params";

export type OrderRow = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  total: number;
  created_at: string;
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ORDERS_CSV_HEADER = csvLine(["Número", "Cliente", "Email", "Estado", "Total", "Fecha"]);

export function orderToCsvLine(o: OrderRow): string {
  return csvLine([
    String(o.order_number),
    safeText(o.customer_name),
    safeText(o.customer_email),
    STATUS_LABEL[o.status],
    formatDecimalEs(Number(o.total)),
    formatDateEs(o.created_at),
  ]);
}

/** Recorre el conjunto completo por lotes; un error de la fuente aborta (nunca entrega un CSV truncado en silencio). */
export async function* ordersCsvChunks(
  fetchBatch: (offset: number, limit: number) => Promise<OrderRow[]>,
  batchSize = 1000,
): AsyncGenerator<string> {
  yield CSV_BOM + ORDERS_CSV_HEADER;
  for (let offset = 0; ; offset += batchSize) {
    const rows = await fetchBatch(offset, batchSize);
    if (rows.length > 0) yield rows.map(orderToCsvLine).join("");
    if (rows.length < batchSize) return;
  }
}
