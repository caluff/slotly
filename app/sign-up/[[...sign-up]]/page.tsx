import { FormSkeleton } from "@/components/loading-screens";
import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { authAppearance } from "@/components/auth-appearance";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <AuthShell label="Crear una cuenta en Slotly">
      <Suspense fallback={<FormSkeleton compact />}>
        <SignUp appearance={authAppearance} fallback={<FormSkeleton compact />} />
      </Suspense>
    </AuthShell>
  );
}
