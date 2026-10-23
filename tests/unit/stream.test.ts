import { describe, expect, it } from "vitest";
import { toByteStream } from "@/lib/stream";

async function readAll(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const dec = new TextDecoder("utf-8", { ignoreBOM: true });
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out += dec.decode(value, { stream: true });
  }
}

describe("toByteStream", () => {
  it("codifica en UTF-8 y conserva acentos y el BOM", async () => {
    async function* g() {
      yield "﻿Número;";
      yield "Peña\r\n";
    }
    expect(await readAll(toByteStream(g()))).toBe("﻿Número;Peña\r\n");
    const first = (await toByteStream(g()).getReader().read()).value!;
    expect([...first.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("si el generador falla, el stream falla (no se cierra como si estuviera completo)", async () => {
    async function* g() {
      yield "a";
      throw new Error("fallo");
    }
    await expect(readAll(toByteStream(g()))).rejects.toThrow("fallo");
  });
});
