/** Convierte un generador de texto en un stream de bytes UTF-8; un error del generador aborta el stream. */
export function toByteStream(source: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const it = source[Symbol.asyncIterator]();
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await it.next();
        if (done) controller.close();
        else controller.enqueue(enc.encode(value));
      } catch (e) {
        controller.error(e);
      }
    },
    async cancel() {
      await it.return?.();
    },
  });
}
