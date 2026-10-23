import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, PAGE_SIZE, pageRange, parseOrderParams } from "@/lib/orders/params";

describe("parseOrderParams", () => {
  it("sin parámetros: todos los estados, página 1", () => {
    expect(parseOrderParams({})).toEqual({ status: null, page: 1 });
  });

  it.each(ORDER_STATUSES)("acepta el estado válido %s", (s) => {
    expect(parseOrderParams({ status: s }).status).toBe(s);
  });

  it.each(["inventado", "", "PAGADO", "pagado;drop table orders", "todos"])("ignora el estado inválido %j", (s) => {
    expect(parseOrderParams({ status: s }).status).toBeNull();
  });

  it("si el estado viene repetido usa el primero", () => {
    expect(parseOrderParams({ status: ["enviado", "pagado"] }).status).toBe("enviado");
  });

  it.each([
    ["3", 3],
    ["1", 1],
    ["120", 120],
  ])("página %j → %i", (raw, expected) => {
    expect(parseOrderParams({ page: raw }).page).toBe(expected);
  });

  it.each(["0", "-2", "abc", "1.5", "", "1e3", "99999999999999999999", " 2"])("página inválida %j cae a 1", (raw) => {
    expect(parseOrderParams({ page: raw }).page).toBe(1);
  });

  it("tolera undefined y arrays en page", () => {
    expect(parseOrderParams({ page: undefined }).page).toBe(1);
    expect(parseOrderParams({ page: ["4", "9"] }).page).toBe(4);
  });
});

describe("pageRange", () => {
  it("el tamaño de página es 50", () => expect(PAGE_SIZE).toBe(50));
  it("página 1 → filas 0..49", () => expect(pageRange(1)).toEqual({ from: 0, to: 49 }));
  it("página 2 → filas 50..99", () => expect(pageRange(2)).toEqual({ from: 50, to: 99 }));
  it("página 7 → filas 300..349", () => expect(pageRange(7)).toEqual({ from: 300, to: 349 }));
});
