import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { connection } from "next/server";
import { productionConfigErrors } from "@/lib/production-config";

const ready = makeFunctionReference<"query", Record<string, never>, null>("systemHealth:ready");

export async function GET() {
  await connection();
  let healthy = false;
  if (!productionConfigErrors(process.env).length && process.env.NEXT_PUBLIC_CONVEX_URL) {
    try {
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL, {
        logger: false,
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(4000) }),
      });
      healthy = await client.query(ready, {}) === null;
    } catch { /* Health responses never disclose backend URLs or exceptions. */ }
  }
  if (!healthy) console.error(JSON.stringify({ event: "slotly.health_unavailable", at: new Date().toISOString() }));
  return Response.json({ status: healthy ? "ok" : "unavailable" }, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
