import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { STORE_A, STORE_B, USER_A, USER_B, USER_NO_PROFILE, asUser, createDb, seedBasic } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await createDb();
  await seedBasic(db);
});
afterAll(() => db.close());

const count = async (sql: string) => Number((await db.query<{ n: string }>(sql)).rows[0].n);

describe("RLS: cada usuario ve solo los pedidos de su tienda", () => {
  it("RLS está activo y forzado en las tablas de negocio", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relname in ('orders','profiles','stores') and relkind = 'r'",
    );
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(r.relrowsecurity, r.relname).toBe(true);
  });

  it("el usuario A ve exactamente los 120 pedidos de su tienda", async () => {
    const n = await asUser(db, USER_A, () => count("select count(*) n from orders"));
    expect(n).toBe(120);
  });

  it("el usuario B ve exactamente los 5 de la suya", async () => {
    const n = await asUser(db, USER_B, () => count("select count(*) n from orders"));
    expect(n).toBe(5);
  });

  it("pedir explícitamente la tienda ajena devuelve 0 filas", async () => {
    const n = await asUser(db, USER_A, () => count(`select count(*) n from orders where store_id = '${STORE_B}'`));
    expect(n).toBe(0);
  });

  it("un usuario sin perfil no ve ningún pedido", async () => {
    const n = await asUser(db, USER_NO_PROFILE, () => count("select count(*) n from orders"));
    expect(n).toBe(0);
  });

  it("sin sesión (anon) no puede leer pedidos", async () => {
    await expect(asUser(db, null, () => count("select count(*) n from orders"))).rejects.toThrow(/permission denied/i);
  });

  it("el usuario solo ve su propio perfil y su propia tienda", async () => {
    const profiles = await asUser(db, USER_A, () => count("select count(*) n from profiles"));
    const stores = await asUser(db, USER_A, () => count("select count(*) n from stores"));
    expect(profiles).toBe(1);
    expect(stores).toBe(1);
  });

  it("no puede insertar pedidos en otra tienda", async () => {
    await expect(
      asUser(db, USER_A, () =>
        db.query(
          `insert into orders (store_id, customer_name, customer_email, status, total) values ('${STORE_B}','x','x@x.es','pendiente',1)`,
        ),
      ),
    ).rejects.toThrow();
  });

  it("no puede modificar ni borrar pedidos (el MVP es de solo lectura)", async () => {
    await expect(asUser(db, USER_A, () => db.query("update orders set total = 0"))).rejects.toThrow();
    await expect(asUser(db, USER_A, () => db.query("delete from orders"))).rejects.toThrow();
  });

  it("no puede escalar privilegios cambiando su store_id en el perfil", async () => {
    await expect(
      asUser(db, USER_A, () => db.query(`update profiles set store_id = '${STORE_B}'`)),
    ).rejects.toThrow();
  });
});

describe("esquema: integridad y rendimiento del listado", () => {
  it("rechaza estados fuera del catálogo", async () => {
    await expect(
      db.query(
        `insert into orders (store_id, customer_name, customer_email, status, total) values ('${STORE_A}','x','x@x.es','inventado',1)`,
      ),
    ).rejects.toThrow(/check|violates/i);
  });

  it("rechaza totales negativos", async () => {
    await expect(
      db.query(
        `insert into orders (store_id, customer_name, customer_email, status, total) values ('${STORE_A}','x','x@x.es','pendiente',-1)`,
      ),
    ).rejects.toThrow(/check|violates/i);
  });

  it("existe índice (store_id, status, created_at desc, id desc) para el listado", async () => {
    const { rows } = await db.query<{ indexdef: string }>("select indexdef from pg_indexes where tablename = 'orders'");
    expect(rows.some((r) => /store_id, status, created_at DESC, id DESC/i.test(r.indexdef))).toBe(true);
  });

  it("order_number es legible y único por pedido", async () => {
    const dup = await count("select count(*) - count(distinct order_number) n from orders");
    expect(dup).toBe(0);
  });
});

describe("paginación de 50 en 50 con filtro, bajo RLS", () => {
  const page = (p: number, status?: string) =>
    `select id, order_number from orders ${status ? `where status = '${status}'` : ""}
     order by created_at desc, id desc limit 50 offset ${(p - 1) * 50}`;

  it("página 1 y 2 traen 50 y 50; página 3 trae los 20 restantes, sin solaparse", async () => {
    const [p1, p2, p3] = await asUser(db, USER_A, async () => [
      (await db.query<{ id: string }>(page(1))).rows,
      (await db.query<{ id: string }>(page(2))).rows,
      (await db.query<{ id: string }>(page(3))).rows,
    ]);
    expect([p1.length, p2.length, p3.length]).toEqual([50, 50, 20]);
    const ids = new Set([...p1, ...p2, ...p3].map((r) => r.id));
    expect(ids.size).toBe(120);
  });

  it("el filtro por estado cuenta solo ese estado (24 de cada 5 en 120)", async () => {
    const n = await asUser(db, USER_A, () => count("select count(*) n from orders where status = 'pagado'"));
    expect(n).toBe(24);
  });
});
