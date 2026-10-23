import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Verifica la sesión contra Supabase Auth, cerca del dato (no solo en el proxy). */
export async function requireUser() {
  // La sesión es por petición: nunca debe prerenderizarse (Supabase usa Date.now() al validarla).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}
