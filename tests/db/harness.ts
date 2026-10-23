import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");

export const STORE_A = "aaaaaaaa-0000-0000-0000-00000000000a";
export const STORE_B = "bbbbbbbb-0000-0000-0000-00000000000b";
export const USER_A = "aaaaaaaa-1111-1111-1111-111111111111";
export const USER_B = "bbbbbbbb-1111-1111-1111-111111111111";
export const USER_NO_PROFILE = "cccccccc-1111-1111-1111-111111111111";

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(fs.readFileSync(path.join(import.meta.dirname, "supabase-stub.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  }
  return db;
}

/** Dos tiendas, tres usuarios (uno sin perfil), 120 pedidos en A y 5 en B. */
export async function seedBasic(db: PGlite): Promise<void> {
  await db.exec(`
    insert into stores (id, name) values ('${STORE_A}', 'Tienda A'), ('${STORE_B}', 'Tienda B');
    insert into auth.users (id, email) values
      ('${USER_A}', 'a@test.es'), ('${USER_B}', 'b@test.es'), ('${USER_NO_PROFILE}', 'x@test.es');
    insert into profiles (user_id, store_id) values ('${USER_A}', '${STORE_A}'), ('${USER_B}', '${STORE_B}');
  `);
  await db.exec(`
    insert into orders (store_id, customer_name, customer_email, status, total, created_at)
    select '${STORE_A}', 'Cliente ' || g, 'c' || g || '@a.es',
           (array['pendiente','pagado','enviado','entregado','cancelado'])[1 + g % 5],
           g * 1.5, timestamptz '2026-01-01' + g * interval '1 hour'
    from generate_series(1, 120) g;
    insert into orders (store_id, customer_name, customer_email, status, total, created_at)
    select '${STORE_B}', 'Otro ' || g, 'o' || g || '@b.es', 'pendiente', 10, now()
    from generate_series(1, 5) g;
  `);
}

/** Ejecuta `fn` como el rol `authenticated` con el JWT de `userId` (o sin sesión si null → rol anon). */
export async function asUser<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec("begin");
  try {
    const claims = userId ? { sub: userId, role: "authenticated" } : { role: "anon" };
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await db.exec(`set local role ${userId ? "authenticated" : "anon"}`);
    return await fn();
  } finally {
    await db.exec("rollback");
  }
}
