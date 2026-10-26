"use client";

import { Button } from "@/components/ui/button";

export default function Error({ retry }: { retry: () => void }) {
  return <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
    <h1 className="workspace-title">No pudimos cargar las reservas</h1>
    <p role="alert" className="my-5 text-muted">Comprueba la conexión y reintenta.</p>
    <Button type="button" onClick={retry}>Reintentar</Button>
  </main>;
}
