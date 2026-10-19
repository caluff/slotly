import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { authAppearance } from "@/components/auth-appearance";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function SignInPage() {
  return (
    <AuthShell label="Iniciar sesión en Slotly">
      <Suspense fallback={<p role="status" className="text-muted">Cargando inicio de sesión…</p>}>
        <SignIn appearance={authAppearance} />
      </Suspense>
    </AuthShell>
  );
}
