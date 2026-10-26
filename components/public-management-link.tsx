"use client";

import { useEffect, useRef, useState } from "react";
import { Copy } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isManagementSecret, managementUrl } from "@/lib/public-management";

// The bearer capability stays in client memory/storage. Never render it into an
// href, input, data attribute, server payload or a prefetched navigation.
export function PublicManagementLink({ secret, showOpen = true }: { secret: string | undefined; showOpen?: boolean }) {
  const [error, setError] = useState("");
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) alert.current?.focus(); }, [error]);
  if (!isManagementSecret(secret)) return null;
  async function copy() {
    try { await navigator.clipboard.writeText(managementUrl(secret!, window.location.origin)); setError(""); toast.success("Enlace privado copiado."); }
    catch { setError("No pudimos copiar el enlace. Reintenta desde este botón."); }
  }
  return <div className="mt-6 space-y-3">
    <div className="flex flex-wrap gap-3">
      {showOpen && <Button type="button" onClick={() => window.location.assign(managementUrl(secret, window.location.origin))}>Gestionar cita</Button>}
      <Button type="button" variant="outline" onClick={copy}><Copy aria-hidden="true" />Copiar enlace privado</Button>
    </div>
    <p className="text-sm text-muted">El enlace permite gestionar tu cita. Guárdalo en privado.</p>
    {error && <p ref={alert} tabIndex={-1} role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
