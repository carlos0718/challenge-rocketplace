import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderRow } from "./csv";
import { pageRange, type OrderStatus } from "./params";

export type OrdersClient = Pick<SupabaseClient, "from">;

export const ORDER_COLUMNS = "id, order_number, customer_name, customer_email, status, total, created_at";

// Nunca se filtra por tienda aquí: el aislamiento lo aplica la base con RLS.
export async function listOrders(
  client: OrdersClient,
  { status, page }: { status: OrderStatus | null; page: number },
): Promise<{ rows: OrderRow[]; total: number }> {
  const { from, to } = pageRange(page);
  let q = client.from("orders").select(ORDER_COLUMNS, { count: "exact" });
  if (status) q = q.eq("status", status);
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as OrderRow[], total: count ?? 0 };
}

export function orderBatchFetcher(client: OrdersClient, status: OrderStatus | null) {
  return async (offset: number, limit: number): Promise<OrderRow[]> => {
    let q = client.from("orders").select(ORDER_COLUMNS);
    if (status) q = q.eq("status", status);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as OrderRow[];
  };
}
