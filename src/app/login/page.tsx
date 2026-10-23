import type { Metadata } from "next";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  const configured = getSupabaseEnv() !== null;
  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Pedidos</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-500">Entra para ver los pedidos de tu tienda.</p>
        {configured ? (
          <LoginForm />
        ) : (
          <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Falta configurar Supabase: define <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en <code>.env.local</code>.
          </p>
        )}
      </div>
    </main>
  );
}
