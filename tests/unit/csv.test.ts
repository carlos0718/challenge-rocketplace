import { describe, expect, it } from "vitest";
import { CSV_BOM, csvField, csvLine, formatDateEs, formatDecimalEs, safeText } from "@/lib/csv";

describe("csvField (separador ; para Excel en español)", () => {
  it("deja intacto el texto simple", () => expect(csvField("Ana")).toBe("Ana"));
  it("entrecomilla si contiene ;", () => expect(csvField("a;b")).toBe('"a;b"'));
  it("entrecomilla y duplica las comillas", () => expect(csvField('di "hola"')).toBe('"di ""hola"""'));
  it("entrecomilla si hay salto de línea", () => {
    expect(csvField("a\nb")).toBe('"a\nb"');
    expect(csvField("a\r\nb")).toBe('"a\r\nb"');
  });
  it("NO entrecomilla por la coma (es el decimal en español)", () => expect(csvField("1,50")).toBe("1,50"));
  it("cadena vacía", () => expect(csvField("")).toBe(""));
});

describe("csvLine", () => {
  it("une con ; y termina en CRLF", () => expect(csvLine(["a", "b;c", "d"])).toBe('a;"b;c";d\r\n'));
});

describe("safeText (inyección de fórmulas en Excel)", () => {
  it.each(["=1+1", "+34600", "-cmd", "@SUM(A1)", "\tfoo", "\rfoo"])("prefija con ' el texto %j", (t) => {
    expect(safeText(t)).toBe("'" + t);
  });
  it("no toca texto normal", () => expect(safeText("María López")).toBe("María López"));
  it("no toca vacío", () => expect(safeText("")).toBe(""));
});

describe("formatDecimalEs", () => {
  it.each([
    [0, "0,00"],
    [1.5, "1,50"],
    [1234.5, "1234,50"],
    [10, "10,00"],
    [0.1 + 0.2, "0,30"],
    [-3.456, "-3,46"],
  ])("%d → %s", (n, s) => expect(formatDecimalEs(n)).toBe(s));
});

describe("formatDateEs (Europe/Madrid)", () => {
  it("invierno (CET, UTC+1)", () => expect(formatDateEs("2026-03-05T14:30:00Z")).toBe("05/03/2026 15:30"));
  it("verano (CEST, UTC+2)", () => expect(formatDateEs("2026-07-01T10:05:00Z")).toBe("01/07/2026 12:05"));
  it("cruza de día por la zona horaria", () => expect(formatDateEs("2026-12-31T23:30:00Z")).toBe("01/01/2027 00:30"));
});

describe("CSV_BOM", () => {
  it("es el BOM UTF-8 para que Excel respete los acentos", () => expect(CSV_BOM).toBe("﻿"));
});
