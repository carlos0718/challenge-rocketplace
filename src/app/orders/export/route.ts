import { NextResponse, type NextRequest } from "next/server";
import { ordersCsvChunks } from "@/lib/orders/csv";
import { csvFilename } from "@/lib/orders/filename";
import { parseOrderParams } from "@/lib/orders/params";
import { orderBatchFetcher } from "@/lib/orders/queries";
import { toByteStream } from "@/lib/stream";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return new NextResponse("No autenticado", { status: 401 });

  // Mismo parseo que el listado: el filtro del CSV es el de la pantalla, sin página.
  const { status } = parseOrderParams(Object.fromEntries(request.nextUrl.searchParams));
  const body = toByteStream(ordersCsvChunks(orderBatchFetcher(supabase, status)));

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(status)}"`,
      "Cache-Control": "no-store",
    },
  });
}
