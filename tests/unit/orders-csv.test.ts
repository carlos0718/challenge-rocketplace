import { describe, expect, it } from "vitest";
import { CSV_BOM } from "@/lib/csv";
import { ORDERS_CSV_HEADER, orderToCsvLine, ordersCsvChunks, type OrderRow } from "@/lib/orders/csv";

const row = (n: number, over: Partial<OrderRow> = {}): OrderRow => ({
  id: `id-${n}`,
  order_number: n,
  customer_name: `Cliente ${n}`,
  customer_email: `c${n}@x.es`,
  status: "pagado",
  total: 12.5,
  created_at: "2026-03-05T14:30:00Z",
  ...over,
});

describe("orderToCsvLine", () => {
  it("formatea una fila en español", () => {
    expect(orderToCsvLine(row(7))).toBe("7;Cliente 7;c7@x.es;Pagado;12,50;05/03/2026 15:30\r\n");
  });
  it("protege nombres que parecen fórmulas y escapa separadores", () => {
    const line = orderToCsvLine(row(1, { customer_name: '=HYPERLINK("x");y' }));
    expect(line).toBe(`1;"'=HYPERLINK(""x"");y";c1@x.es;Pagado;12,50;05/03/2026 15:30\r\n`);
  });
  it("el total negativo o numérico no se trata como fórmula", () => {
    expect(orderToCsvLine(row(1, { total: 0 }))).toContain(";0,00;");
  });
});

describe("ordersCsvChunks: exporta TODO el conjunto, no solo una página", () => {
  const collect = async (it: AsyncIterable<string>) => {
    let s = "";
    for await (const c of it) s += c;
    return s;
  };
  // Fuente falsa con 2.350 filas que respeta offset/limit.
  const all = Array.from({ length: 2350 }, (_, i) => row(i + 1));
  const fetcher = (calls: Array<[number, number]> = []) => async (offset: number, limit: number) => {
    calls.push([offset, limit]);
    return all.slice(offset, offset + limit);
  };

  it("empieza con BOM + cabecera", async () => {
    const out = await collect(ordersCsvChunks(fetcher(), 1000));
    expect(out.startsWith(CSV_BOM + ORDERS_CSV_HEADER)).toBe(true);
    expect(ORDERS_CSV_HEADER).toBe("Número;Cliente;Email;Estado;Total;Fecha\r\n");
  });

  it("incluye las 2.350 filas (más allá de una página de 50 o un lote de 1000)", async () => {
    const out = await collect(ordersCsvChunks(fetcher(), 1000));
    expect(out.split("\r\n").filter(Boolean)).toHaveLength(1 + 2350);
  });

  it("pide lotes consecutivos y se detiene en el primer lote incompleto", async () => {
    const calls: Array<[number, number]> = [];
    await collect(ordersCsvChunks(fetcher(calls), 1000));
    expect(calls).toEqual([
      [0, 1000],
      [1000, 1000],
      [2000, 1000],
    ]);
  });

  it("si el total es múltiplo exacto del lote, hace una última petición vacía y termina", async () => {
    const calls: Array<[number, number]> = [];
    const exact = async (o: number, l: number) => {
      calls.push([o, l]);
      return all.slice(0, 2000).slice(o, o + l);
    };
    const out = await collect(ordersCsvChunks(exact, 1000));
    expect(out.split("\r\n").filter(Boolean)).toHaveLength(1 + 2000);
    expect(calls).toHaveLength(3);
  });

  it("conjunto vacío: solo BOM y cabecera", async () => {
    const out = await collect(ordersCsvChunks(async () => [], 1000));
    expect(out).toBe(CSV_BOM + ORDERS_CSV_HEADER);
  });

  it("propaga el error de la fuente en vez de entregar un CSV truncado en silencio", async () => {
    const boom = async (o: number) => {
      if (o > 0) throw new Error("fallo de red");
      return all.slice(0, 1000);
    };
    await expect(collect(ordersCsvChunks(boom, 1000))).rejects.toThrow("fallo de red");
  });
});
