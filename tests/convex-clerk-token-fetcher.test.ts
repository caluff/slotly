import { describe, expect, it, vi } from "vitest";
import { clerkTokenFetcher } from "../lib/convex-clerk-token-fetcher";

describe("Adaptación oficial de credenciales Clerk para Convex", () => {
  it("solicita la plantilla convex sin cambiar la configuración existente", async () => {
    const getToken = vi.fn().mockResolvedValue(null);
    await clerkTokenFetcher(getToken, false, false)({ forceRefreshToken: false });
    expect(getToken).toHaveBeenCalledExactlyOnceWith({ template: "convex", skipCache: false });
  });

  it("conserva la integración que usa el token de sesión con aud convex", async () => {
    const getToken = vi.fn().mockResolvedValue(null);
    await clerkTokenFetcher(getToken, true, false)({ forceRefreshToken: false });
    expect(getToken).toHaveBeenCalledExactlyOnceWith({ skipCache: false });
  });

  it("respeta la renovación forzada por el SDK", async () => {
    const getToken = vi.fn().mockResolvedValue(null);
    await clerkTokenFetcher(getToken, false, false)({ forceRefreshToken: true });
    expect(getToken).toHaveBeenCalledExactlyOnceWith({ template: "convex", skipCache: true });
  });

  it("pide una credencial fresca a Clerk al reintentar acceso", async () => {
    const getToken = vi.fn().mockResolvedValue(null);
    await clerkTokenFetcher(getToken, false, true)({ forceRefreshToken: false });
    expect(getToken).toHaveBeenCalledExactlyOnceWith({ template: "convex", skipCache: true });
  });

  it("un fallo de conexión devuelve null, sin declarar acceso", async () => {
    const getToken = vi.fn().mockRejectedValue(new Error("Fallo sintético de red"));
    await expect(clerkTokenFetcher(getToken, false, true)({ forceRefreshToken: true })).resolves.toBeNull();
  });

  it("delega cada petición a Clerk sin guardar ni reutilizar credenciales", async () => {
    const getToken = vi.fn().mockResolvedValueOnce("credencial-sintética-en-memoria").mockResolvedValueOnce(null);
    const fetchToken = clerkTokenFetcher(getToken, false, true);
    expect(getToken).not.toHaveBeenCalled();
    await expect(fetchToken({ forceRefreshToken: false })).resolves.toBe("credencial-sintética-en-memoria");
    await expect(fetchToken({ forceRefreshToken: false })).resolves.toBeNull();
    expect(getToken).toHaveBeenCalledTimes(2);
  });
});
