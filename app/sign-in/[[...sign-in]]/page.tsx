import { FormSkeleton } from "@/components/loading-screens";
import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { authAppearance } from "@/components/auth-appearance";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function SignInPage() {
  return (
    <AuthShell label="Iniciar sesión en Slotly">
      <Suspense fallback={<FormSkeleton compact />}>
        <SignIn appearance={authAppearance} fallback={<FormSkeleton compact />} />
      </Suspense>
    </AuthShell>
  );
}
