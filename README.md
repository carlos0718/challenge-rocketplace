# Pedidos multi-tienda (MVP)

Listado de pedidos de varias tiendas en una misma base de datos, con:

- **Paginación de 50 en 50** y **filtro por estado en la URL** (`/orders?status=pagado&page=2`).
- **Descarga CSV del conjunto filtrado completo** (no solo de la página), listo para abrir en Excel en español: separador `;`, coma decimal, fechas `dd/mm/aaaa`, BOM UTF-8 y protección frente a fórmulas.
- **Aislamiento por tienda garantizado por la base de datos** (RLS de Postgres), no por la pantalla: el código nunca filtra por tienda.

Stack: Next.js (App Router, Cache Components) + TypeScript + Supabase (Postgres + Auth).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local        # rellena URL, anon key y DATABASE_URL
psql "$DATABASE_URL" --single-transaction -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" --single-transaction -f supabase/seed.sql   # solo desarrollo
npm run dev
```

Usuarios demo (solo desarrollo): `madrid@demo.es`, `barcelona@demo.es`, `valencia@demo.es`, contraseña `Demo1234!`.
Cada uno ve únicamente los pedidos de su tienda (2.345, 1.200 y 180).

## Seguridad

- `revoke all` + `grant select` a `authenticated`; `anon` no tiene permisos. La app es de solo lectura.
- Políticas RLS en `stores`, `profiles` y `orders` basadas en `auth.uid()`.
- La app usa solo la `anon key` con el JWT del usuario; la `service_role` no se usa nunca.

## Tests (TDD)

```bash
npm test
```

| Capa | Qué comprueba |
| --- | --- |
| `tests/db` | RLS y esquema sobre Postgres real en memoria (PGlite) |
| `tests/unit` | URL, paginación, consultas, CSV, nombre de archivo y stream |
| `tests/integration` | Mismo aislamiento contra Supabase real y la ruta `/orders/export` contra `npm run dev` (se omiten sin `.env.local` o sin servidor) |
