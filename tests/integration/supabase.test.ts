import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { ordersCsvChunks } from "@/lib/orders/csv";
import { ORDER_STATUSES } from "@/lib/orders/params";
import { listOrders, orderBatchFetcher } from "@/lib/orders/queries";

// Contra el Supabase real (requiere .env.local y el seed aplicado). Sin claves, se omite.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = "Demo1234!";
const STORES = [
  { email: "madrid@demo.es", orders: 2345 },
  { email: "barcelona@demo.es", orders: 1200 },
  { email: "valencia@demo.es", orders: 180 },
];

async function login(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return client;
}

describe.skipIf(!url || !key)("Supabase real: aislamiento por tienda (RLS)", () => {
  const clients: Record<string, SupabaseClient> = {};
  beforeAll(async () => {
    for (const s of STORES) clients[s.email] = await login(s.email);
  });

  it.each(STORES)("$email ve exactamente $orders pedidos, todos de su tienda", async ({ email, orders }) => {
    const { total } = await listOrders(clients[email], { status: null, page: 1 });
    expect(total).toBe(orders);
    const { data } = await clients[email].from("orders").select("store_id");
    expect(new Set(data!.map((r) => r.store_id)).size).toBe(1);
  });

  it("pedir la tienda de otro devuelve 0 filas", async () => {
    const { data: other } = await clients["barcelona@demo.es"].from("stores").select("id").single();
    const { data, count } = await clients["madrid@demo.es"]
      .from("orders")
      .select("id", { count: "exact" })
      .eq("store_id", other!.id);
    expect(data).toEqual([]);
    expect(count).toBe(0);
  });

  it("sin sesión (anon) la base rechaza leer pedidos", async () => {
    const anon = createClient(url!, key!, { auth: { persistSession: false } });
    const { data, error } = await anon.from("orders").select("id").limit(1);
    expect(data).toBeNull();
    expect(error?.message).toMatch(/permission denied/i);
  });

  it("un usuario no puede cambiarse de tienda ni tocar pedidos", async () => {
    const { data: other } = await clients["valencia@demo.es"].from("stores").select("id").single();
    const c = clients["madrid@demo.es"];
    expect((await c.from("profiles").update({ store_id: other!.id }).neq("store_id", other!.id)).error).not.toBeNull();
    expect((await c.from("orders").update({ total: 0 }).neq("total", -1)).error).not.toBeNull();
    expect((await c.from("orders").delete().neq("total", -1)).error).not.toBeNull();
  });

  it("paginación: 47 páginas en Madrid; la última tiene 45 filas y no hay solapes", async () => {
    const c = clients["madrid@demo.es"];
    const ids = new Set<string>();
    for (let p = 1; p <= 47; p++) {
      const { rows } = await listOrders(c, { status: null, page: p });
      expect(rows.length).toBe(p === 47 ? 45 : 50);
      rows.forEach((r) => ids.add(r.id));
    }
    expect(ids.size).toBe(2345);
  });

  it("el CSV exporta TODO el conjunto filtrado y coincide con el contador del listado", async () => {
    const c = clients["madrid@demo.es"];
    for (const status of [null, ...ORDER_STATUSES]) {
      const { total } = await listOrders(c, { status, page: 1 });
      let csv = "";
      for await (const chunk of ordersCsvChunks(orderBatchFetcher(c, status), 1000)) csv += chunk;
      const lines = csv.split("\r\n").filter(Boolean);
      expect(lines.length - 1, `estado ${status}`).toBe(total);
    }
  });

  it("el CSV de Madrid incluye nombres con ; comillas y fórmulas, escapados", async () => {
    const c = clients["madrid@demo.es"];
    let csv = "";
    for await (const chunk of ordersCsvChunks(orderBatchFetcher(c, null), 1000)) csv += chunk;
    expect(csv).toContain(`"Peña, José ""Pepe""; S.L."`);
    expect(csv).toContain(`"'=HYPERLINK(""http://malo.example"")"`);
    expect(csv).not.toMatch(/;=HYPERLINK/);
  });
});
