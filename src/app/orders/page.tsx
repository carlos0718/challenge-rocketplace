import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { formatDateEs } from "@/lib/csv";
import { STATUS_LABEL } from "@/lib/orders/csv";
import { ORDER_STATUSES, parseOrderParams, type OrderStatus } from "@/lib/orders/params";
import { paginationInfo } from "@/lib/orders/pagination";
import { listOrders } from "@/lib/orders/queries";
import { exportHref, ordersHref } from "@/lib/orders/urls";

export const metadata: Metadata = { title: "Listado" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BADGE: Record<OrderStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  pagado: "bg-sky-100 text-sky-800",
  enviado: "bg-indigo-100 text-indigo-800",
  entregado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-neutral-200 text-neutral-700",
};

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export default function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-neutral-100" />}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OrdersContent({ searchParams }: { searchParams: SearchParams }) {
  const { status, page } = parseOrderParams(await searchParams);
  const { supabase } = await requireUser();
  const { rows, total } = await listOrders(supabase, { status, page });
  const info = paginationInfo(total, page);
  if (info.outOfRange) redirect(ordersHref({ status, page: info.totalPages }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
          <FilterLink href={ordersHref({ status: null, page: 1 })} active={status === null}>
            Todos
          </FilterLink>
          {ORDER_STATUSES.map((s) => (
            <FilterLink key={s} href={ordersHref({ status: s, page: 1 })} active={status === s}>
              {STATUS_LABEL[s]}
            </FilterLink>
          ))}
        </nav>
        {/* Enlace normal (no <Link>): es una descarga y exporta todo el conjunto filtrado. */}
        <a
          href={exportHref({ status })}
          download
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Descargar CSV{status ? ` (${STATUS_LABEL[status].toLowerCase()})` : ""}
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-mono text-neutral-500">{o.order_number}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{o.customer_name}</td>
                <td className="px-4 py-3 text-neutral-600">{o.customer_email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{money.format(Number(o.total))}</td>
                <td className="px-4 py-3 text-neutral-600">{formatDateEs(o.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                  No hay pedidos{status ? ` con estado “${STATUS_LABEL[status].toLowerCase()}”` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-600">
        <p>
          {total === 0 ? "0 pedidos" : `Mostrando ${info.from}–${info.to} de ${total}`}
          {" · "}Página {page} de {info.totalPages}
        </p>
        <div className="flex gap-2">
          <PageLink href={ordersHref({ status, page: page - 1 })} enabled={info.hasPrev}>
            ← Anterior
          </PageLink>
          <PageLink href={ordersHref({ status, page: page + 1 })} enabled={info.hasNext}>
            Siguiente →
          </PageLink>
        </div>
      </div>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {children}
    </Link>
  );
}

function PageLink({ href, enabled, children }: { href: string; enabled: boolean; children: React.ReactNode }) {
  const cls = "rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium";
  return enabled ? (
    <Link href={href} className={`${cls} text-neutral-700 hover:bg-neutral-100`}>
      {children}
    </Link>
  ) : (
    <span aria-disabled="true" className={`${cls} cursor-not-allowed text-neutral-300`}>
      {children}
    </span>
  );
}
