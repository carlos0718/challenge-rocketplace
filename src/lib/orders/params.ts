export const PAGE_SIZE = 50;

export const ORDER_STATUSES = ["pendiente", "pagado", "enviado", "entregado", "cancelado"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseOrderParams(params: RawParams): { status: OrderStatus | null; page: number } {
  const rawStatus = first(params.status);
  const status = ORDER_STATUSES.find((s) => s === rawStatus) ?? null;

  const rawPage = first(params.page);
  const page = rawPage !== undefined && /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) ? Number(rawPage) : 1;

  return { status, page };
}

/** Rango inclusivo de filas (compatible con `.range()` de supabase-js). */
export function pageRange(page: number): { from: number; to: number } {
  const from = (page - 1) * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}
