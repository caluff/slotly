"use client";

export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">No pudimos cargar tu espacio</h1>
      <p role="alert" className="mt-4 leading-7 text-muted">
        Comprueba tu conexión e inténtalo de nuevo. Si acabas de iniciar sesión, espera unos segundos antes de reintentar.
      </p>
      <button type="button" onClick={retry} className="button-primary mt-6 cursor-pointer">Reintentar</button>
    </main>
  );
}
