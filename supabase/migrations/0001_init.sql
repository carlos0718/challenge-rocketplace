-- Multi-tienda: stores, profiles (usuario → tienda) y orders, con aislamiento por RLS.

create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  store_id uuid not null references stores (id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  store_id uuid not null references stores (id),
  customer_name text not null,
  customer_email text not null,
  status text not null check (status in ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado')),
  total numeric(12, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

-- Listado: filtro por tienda (+ estado) ordenado de forma estable y paginable.
create index orders_store_status_created_idx on orders (store_id, status, created_at desc, id desc);
create index orders_store_created_idx on orders (store_id, created_at desc, id desc);

-- Seguridad: Supabase concede ALL por defecto en public; lo recortamos a solo lectura.
revoke all on stores, profiles, orders from anon, authenticated;
grant select on stores, profiles, orders to authenticated;

alter table stores enable row level security;
alter table profiles enable row level security;
alter table orders enable row level security;

create policy profiles_select_own on profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy stores_select_own on stores
  for select to authenticated
  using (id = (select store_id from profiles where user_id = (select auth.uid())));

create policy orders_select_own_store on orders
  for select to authenticated
  using (store_id = (select store_id from profiles where user_id = (select auth.uid())));
