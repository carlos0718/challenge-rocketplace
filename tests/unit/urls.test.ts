import { describe, expect, it } from "vitest";
import { exportHref, ordersHref } from "@/lib/orders/urls";

describe("ordersHref (el estado y la página viajan en la URL)", () => {
  it("sin filtro y página 1: /orders limpio", () => expect(ordersHref({ status: null, page: 1 })).toBe("/orders"));
  it("solo estado", () => expect(ordersHref({ status: "pagado", page: 1 })).toBe("/orders?status=pagado"));
  it("solo página", () => expect(ordersHref({ status: null, page: 3 })).toBe("/orders?page=3"));
  it("estado y página", () => expect(ordersHref({ status: "enviado", page: 2 })).toBe("/orders?status=enviado&page=2"));
});

describe("exportHref (el CSV usa el mismo filtro, nunca la página)", () => {
  it("sin filtro", () => expect(exportHref({ status: null })).toBe("/orders/export"));
  it("con filtro", () => expect(exportHref({ status: "cancelado" })).toBe("/orders/export?status=cancelado"));
});
