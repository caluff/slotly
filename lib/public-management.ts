export const MANAGEMENT_PATH = "/gestionar-cita";
export const MANAGEMENT_LIFETIME_MS = 90 * 24 * 60 * 60_000;
export const MANAGEMENT_SESSION_KEY = "slotly:public-management:current";

// Canonical unpadded base64url encoding of exactly 32 random bytes (256 bits).
export function isManagementSecret(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value);
}
export function newManagementSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export async function managementSecretHash(secret: string) {
  const bytes = new TextEncoder().encode(`slotly/public-management/v1:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("");
}
export function managementUrl(secret: string, origin: string) {
  const url = new URL(MANAGEMENT_PATH, origin);
  url.hash = secret;
  return url.href;
}
