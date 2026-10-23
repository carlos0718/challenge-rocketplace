import { describe, expect, it } from "vitest";
import { ORDER_COLUMNS, listOrders, orderBatchFetcher, type OrdersClient } from "@/lib/orders/queries";

type Call = [string, ...unknown[]];

/** Cliente falso con la forma de supabase-js: registra la cadena de llamadas y es "thenable". */
type Result = { data: unknown[] | null; error: { message: string; code?: string } | null; count?: number | null };

/** Acepta un resultado fijo o una secuencia (una consulta por elemento; el último se repite). */
function fakeClient(input: Result | Result[]) {
  const queue = Array.isArray(input) ? [...input] : [input];
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "range"]) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return builder;
    };
  }
  builder.then = (res: (v: unknown) => unknown) => Promise.resolve(res(queue.length > 1 ? queue.shift() : queue[0]));
  const client = { from: (t: string) => (calls.push(["from", t]), builder) } as unknown as OrdersClient;
  return { client, calls };
}

const ok = (n: number) => ({ data: Array.from({ length: n }, (_, i) => ({ id: String(i) })), error: null, count: 120 });

describe("listOrders", () => {
  it("sin filtro: ordena de forma estable, pide el total y la primera página", async () => {
    const { client, calls } = fakeClient(ok(50));
    const r = await listOrders(client, { status: null, page: 1 });
    expect(calls).toEqual([
      ["from", "orders"],
      ["select", ORDER_COLUMNS, { count: "exact" }],
      ["order", "created_at", { ascending: false }],
      ["order", "id", { ascending: false }],
      ["range", 0, 49],
    ]);
    expect(r.rows).toHaveLength(50);
    expect(r.total).toBe(120);
  });

  it("con estado: añade el filtro eq", async () => {
    const { client, calls } = fakeClient(ok(10));
    await listOrders(client, { status: "pagado", page: 1 });
    expect(calls).toContainEqual(["eq", "status", "pagado"]);
  });

  it("sin estado: no añade ningún eq", async () => {
    const { client, calls } = fakeClient(ok(10));
    await listOrders(client, { status: null, page: 1 });
    expect(calls.some((c) => c[0] === "eq")).toBe(false);
  });

  it("la página 3 pide las filas 100..149", async () => {
    const { client, calls } = fakeClient(ok(20));
    await listOrders(client, { status: null, page: 3 });
    expect(calls).toContainEqual(["range", 100, 149]);
  });

  it("nunca filtra por tienda en el código: eso lo garantiza la base (RLS)", async () => {
    const { client, calls } = fakeClient(ok(1));
    await listOrders(client, { status: null, page: 1 });
    expect(JSON.stringify(calls)).not.toMatch(/store/i);
  });

  it("count nulo se trata como 0", async () => {
    const { client } = fakeClient({ data: [], error: null, count: null });
    expect((await listOrders(client, { status: null, page: 1 })).total).toBe(0);
  });

  it("propaga el error de la base", async () => {
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    await expect(listOrders(client, { status: null, page: 1 })).rejects.toThrow("boom");
  });

  describe("página fuera de rango (PostgREST responde 416 / PGRST103)", () => {
    const outOfRange: Result = { data: null, error: { message: "Requested range not satisfiable", code: "PGRST103" } };

    it("no falla: devuelve 0 filas y el total real para que la pantalla redirija a la última página", async () => {
      const { client } = fakeClient([outOfRange, { data: null, error: null, count: 1200 }]);
      expect(await listOrders(client, { status: null, page: 47 })).toEqual({ rows: [], total: 1200 });
    });

    it("el total se pide con una consulta de solo conteo (head) y respeta el filtro de estado", async () => {
      const { client, calls } = fakeClient([outOfRange, { data: null, error: null, count: 240 }]);
      await listOrders(client, { status: "pagado", page: 99 });
      const second = calls.slice(calls.findIndex((c) => c[0] === "range") + 1);
      expect(second).toEqual([
        ["from", "orders"],
        ["select", "id", { count: "exact", head: true }],
        ["eq", "status", "pagado"],
      ]);
    });

    it("otros errores distintos de PGRST103 siguen propagándose", async () => {
      const { client } = fakeClient({ data: null, error: { message: "permission denied", code: "42501" } });
      await expect(listOrders(client, { status: null, page: 1 })).rejects.toThrow("permission denied");
    });

    it("si falla también el conteo, propaga ese error", async () => {
      const { client } = fakeClient([outOfRange, { data: null, error: { message: "count roto" }, count: null }]);
      await expect(listOrders(client, { status: null, page: 47 })).rejects.toThrow("count roto");
    });
  });
});

describe("orderBatchFetcher (exportación)", () => {
  it("pide el lote con el mismo orden y filtro, sin contar", async () => {
    const { client, calls } = fakeClient(ok(1000));
    await orderBatchFetcher(client, "enviado")(1000, 1000);
    expect(calls).toEqual([
      ["from", "orders"],
      ["select", ORDER_COLUMNS],
      ["eq", "status", "enviado"],
      ["order", "created_at", { ascending: false }],
      ["order", "id", { ascending: false }],
      ["range", 1000, 1999],
    ]);
  });

  it("sin estado exporta todo el conjunto (sin eq)", async () => {
    const { client, calls } = fakeClient(ok(5));
    await orderBatchFetcher(client, null)(0, 1000);
    expect(calls.some((c) => c[0] === "eq")).toBe(false);
  });

  it("propaga el error en vez de devolver un lote vacío (que truncaría el CSV)", async () => {
    const { client } = fakeClient({ data: null, error: { message: "timeout" } });
    await expect(orderBatchFetcher(client, null)(0, 1000)).rejects.toThrow("timeout");
  });
});
