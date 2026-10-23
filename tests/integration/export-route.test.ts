import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

// E2E de la ruta /orders/export contra el servidor local (npm run dev) y el Supabase real.
// Si el servidor no está levantado o faltan las claves, se omite.
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function serverUp() {
  try {
    await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}
const up = !!url && !!key && (await serverUp());

/** Cookie de sesión con el formato de @supabase/ssr (base64url en trozos de 3180 caracteres). */
async function sessionCookie(email: string): Promise<string> {
  const client = createClient(url!, key!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: "Demo1234!" });
  if (error) throw error;
  const name = `sb-${new URL(url!).hostname.split(".")[0]}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  const chunks = value.match(/.{1,3180}/g)!;
  return chunks.length === 1 ? `${name}=${value}` : chunks.map((c, i) => `${name}.${i}=${c}`).join("; ");
}

async function download(path: string, cookie?: string) {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const bytes = new Uint8Array(await res.arrayBuffer());
  const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
  return { res, bytes, lines: text.split("\r\n").filter(Boolean) };
}

describe.skipIf(!up)("GET /orders/export (servidor local + Supabase real)", () => {
  let madrid: string;
  let barcelona: string;
  beforeAll(async () => {
    madrid = await sessionCookie("madrid@demo.es");
    barcelona = await sessionCookie("barcelona@demo.es");
  });

  it("sin sesión no entrega nada: redirige al login", async () => {
    const { res } = await download("/orders/export");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("descarga TODO el conjunto de la tienda (más de una página y más de un lote)", async () => {
    const { res, lines } = await download("/orders/export", madrid);
    expect(res.status).toBe(200);
    expect(lines.length - 1).toBe(2345);
  });

  it("cabeceras HTTP: CSV UTF-8, adjunto con nombre y sin caché", async () => {
    const { res } = await download("/orders/export?status=pagado", madrid);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="pedidos-pagado-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("formato Excel en español: BOM, cabecera con ; y filas con coma decimal", async () => {
    const { bytes, lines } = await download("/orders/export", madrid);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(lines[0]).toBe("﻿Número;Cliente;Email;Estado;Total;Fecha");
    expect(lines[3]).toMatch(/^\d+;.+;m\d+@cliente\.example;(Pendiente|Pagado|Enviado|Entregado|Cancelado);\d+,\d{2};\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it("respeta el filtro de estado y exporta todas sus filas, no solo una página", async () => {
    const { lines } = await download("/orders/export?status=pagado", madrid);
    const rows = lines.slice(1);
    expect(rows.length).toBeGreaterThan(50);
    expect(rows.every((l) => l.includes(";Pagado;"))).toBe(true);
  });

  it("un estado inválido se ignora y exporta todo (no rompe)", async () => {
    const { res, lines } = await download("/orders/export?status=inventado%3Bdrop", madrid);
    expect(res.status).toBe(200);
    expect(lines.length - 1).toBe(2345);
  });

  it("cada tienda exporta solo lo suyo: Barcelona no ve nada de Madrid", async () => {
    const { lines } = await download("/orders/export", barcelona);
    expect(lines.length - 1).toBe(1200);
    expect(lines.slice(1).every((l) => /;b\d+@cliente\.example;/.test(l))).toBe(true);
  });

  it("escapa separadores y comillas en los nombres", async () => {
    const { lines } = await download("/orders/export", madrid);
    expect(lines.join("\n")).toContain(`"Peña, José ""Pepe""; S.L."`);
  });
});
