import { describe, expect, it } from "vitest";
import { paginationInfo } from "@/lib/orders/pagination";

describe("paginationInfo", () => {
  it("0 pedidos: una página vacía", () => {
    expect(paginationInfo(0, 1)).toEqual({ totalPages: 1, from: 0, to: 0, hasPrev: false, hasNext: false, outOfRange: false });
  });
  it("30 pedidos: una sola página", () => {
    expect(paginationInfo(30, 1)).toEqual({ totalPages: 1, from: 1, to: 30, hasPrev: false, hasNext: false, outOfRange: false });
  });
  it("exactamente 50: una página (no crea una vacía)", () => {
    expect(paginationInfo(50, 1)).toMatchObject({ totalPages: 1, to: 50, hasNext: false });
  });
  it("51 pedidos: dos páginas", () => {
    expect(paginationInfo(51, 1)).toMatchObject({ totalPages: 2, from: 1, to: 50, hasNext: true });
    expect(paginationInfo(51, 2)).toMatchObject({ from: 51, to: 51, hasPrev: true, hasNext: false });
  });
  it("120 pedidos, página 2 (intermedia)", () => {
    expect(paginationInfo(120, 2)).toEqual({ totalPages: 3, from: 51, to: 100, hasPrev: true, hasNext: true, outOfRange: false });
  });
  it("página fuera de rango se señala para redirigir a la última", () => {
    expect(paginationInfo(120, 9)).toMatchObject({ totalPages: 3, outOfRange: true, from: 0, to: 0 });
  });
  it("sin resultados, la página 1 no está fuera de rango pero la 2 sí", () => {
    expect(paginationInfo(0, 1).outOfRange).toBe(false);
    expect(paginationInfo(0, 2).outOfRange).toBe(true);
  });
});
