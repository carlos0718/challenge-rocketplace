-- Datos de demo (idempotente). Usuarios: madrid@demo.es, barcelona@demo.es, valencia@demo.es
-- con la contraseña Demo1234!  ·  Solo para desarrollo: no uses esto en producción.

insert into stores (id, name) values
  ('11111111-aaaa-4aaa-8aaa-000000000001', 'Tienda Madrid'),
  ('22222222-bbbb-4bbb-8bbb-000000000002', 'Tienda Barcelona'),
  ('33333333-cccc-4ccc-8ccc-000000000003', 'Tienda Valencia')
on conflict (id) do nothing;

-- Usuarios con el formato que espera Supabase Auth (GoTrue).
with u(id, email) as (values
  ('aaaaaaaa-1111-4111-8111-000000000001'::uuid, 'madrid@demo.es'),
  ('bbbbbbbb-2222-4222-8222-000000000002'::uuid, 'barcelona@demo.es'),
  ('cccccccc-3333-4333-8333-000000000003'::uuid, 'valencia@demo.es')
), new_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
         extensions.crypt('Demo1234!', extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  from u
  on conflict (id) do nothing
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
from new_users;

insert into profiles (user_id, store_id) values
  ('aaaaaaaa-1111-4111-8111-000000000001', '11111111-aaaa-4aaa-8aaa-000000000001'),
  ('bbbbbbbb-2222-4222-8222-000000000002', '22222222-bbbb-4bbb-8bbb-000000000002'),
  ('cccccccc-3333-4333-8333-000000000003', '33333333-cccc-4ccc-8ccc-000000000003')
on conflict (user_id) do nothing;

-- Pedidos: solo si la tabla está vacía. Madrid incluye un nombre con ; , y comillas para probar el escapado del CSV.
insert into orders (store_id, customer_name, customer_email, status, total, created_at)
select s.store_id,
       case
         when s.tag = 'M' and g = 1 then 'Peña, José "Pepe"; S.L.'
         else (array['Ana','Luis','María','José','Lucía','Pedro','Carmen','Iván','Núria','Andrés'])[1 + abs(hashtext(s.tag || g)) % 10]
              || ' ' ||
              (array['García','López','Martínez','Sánchez','Peña','Fernández','Muñoz','Gómez'])[1 + abs(hashtext(g || s.tag)) % 8]
       end,
       lower(s.tag) || g || '@cliente.example',
       (array['pendiente','pagado','enviado','entregado','cancelado'])[1 + abs(hashtext('st' || s.tag || g)) % 5],
       round((10 + abs(hashtext('t' || s.tag || g)) % 49000 / 100.0)::numeric, 2),
       now() - g * interval '37 minutes'
from (values
  ('11111111-aaaa-4aaa-8aaa-000000000001'::uuid, 2345, 'M'),
  ('22222222-bbbb-4bbb-8bbb-000000000002'::uuid, 1200, 'B'),
  ('33333333-cccc-4ccc-8ccc-000000000003'::uuid, 180, 'V')
) as s(store_id, n, tag)
cross join lateral generate_series(1, s.n) g
where not exists (select 1 from orders);
