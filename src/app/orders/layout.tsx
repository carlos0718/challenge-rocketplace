import { Suspense } from "react";
import { signOut } from "@/app/actions";
import { requireUser } from "@/lib/auth";

async function UserBar() {
  const { user } = await requireUser();
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-neutral-600">{user.email}</span>
      <form action={signOut}>
        <button className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-100">
          Salir
        </button>
      </form>
    </div>
  );
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-neutral-900">Pedidos</span>
          <Suspense fallback={<div className="h-8 w-40 animate-pulse rounded bg-neutral-100" />}>
            <UserBar />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
