import type { Instrumentation } from "next";
import { productionConfigErrors } from "./lib/production-config";

export function register() {
  const errors = productionConfigErrors(process.env);
  if (errors.length) throw new Error("Configuración de publicación inválida: " + errors.join("; "));
}

export const onRequestError: Instrumentation.onRequestError = (_error, request, context) => {
  // Filesystem route patterns only: no request URLs, bodies, headers, identifiers,
  // exception messages or stacks that might contain contact data/capabilities.
  console.error(JSON.stringify({
    event: "slotly.server_error",
    at: new Date().toISOString(),
    route: context.routePath,
    kind: context.routeType,
    method: /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(request.method) ? request.method : "OTHER",
  }));
};
