type Environment = Record<string, string | undefined>;

// Return names/reasons only. Never include a configuration value in diagnostics.
export function productionConfigErrors(env: Environment): string[] {
  const production = env.SLOTLY_APP_ENV === "production" ||
    (env.VERCEL === "1" && env.VERCEL_ENV === "production");
  if (!production) return [];
  const errors: string[] = [];
  if (env.SLOTLY_APP_ENV !== "production") errors.push("SLOTLY_APP_ENV debe ser production");
  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_")) errors.push("Clerk requiere clave publicable de producción");
  if (!env.CLERK_SECRET_KEY?.startsWith("sk_live_")) errors.push("Clerk requiere clave privada de producción");
  try {
    const backend = new URL(env.NEXT_PUBLIC_CONVEX_URL ?? "");
    if (backend.protocol !== "https:" || !backend.hostname.endsWith(".convex.cloud") ||
      backend.username || backend.password || backend.search || backend.hash || backend.pathname !== "/") throw new Error();
    if (env.CONVEX_DEPLOYMENT !== "prod:" + backend.hostname.slice(0, -".convex.cloud".length)) throw new Error();
  } catch { errors.push("Convex requiere URL HTTPS y CONVEX_DEPLOYMENT prod del mismo destino"); }
  try {
    const origin = new URL(env.SLOTLY_SITE_URL ?? "");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") throw new Error();
  } catch { errors.push("SLOTLY_SITE_URL debe ser un origen HTTPS"); }
  if (env.SLOTLY_EMAIL_READY !== "false") errors.push("El correo debe permanecer desactivado: SLOTLY_EMAIL_READY=false");
  return errors;
}
