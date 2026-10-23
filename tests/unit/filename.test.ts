import { describe, expect, it } from "vitest";
import { csvFilename } from "@/lib/orders/filename";

describe("csvFilename", () => {
  const d = new Date("2026-03-05T14:30:00Z");
  it("sin filtro", () => expect(csvFilename(null, d)).toBe("pedidos-2026-03-05.csv"));
  it("con filtro incluye el estado", () => expect(csvFilename("pagado", d)).toBe("pedidos-pagado-2026-03-05.csv"));
  it("usa la fecha de Madrid (23:30 UTC ya es el día siguiente)", () => {
    expect(csvFilename(null, new Date("2026-12-31T23:30:00Z"))).toBe("pedidos-2027-01-01.csv");
  });
});
