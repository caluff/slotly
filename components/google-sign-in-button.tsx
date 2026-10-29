"use client";

import { useClerk, useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const { loaded } = useClerk();
  const { signIn, fetchStatus } = useSignIn();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const sending = useRef(false);
  async function start() {
    if (!loaded || sending.current) return;
    sending.current = true; setBusy(true); setFailed(false);
    try {
      const { error } = await signIn.sso({ strategy: "oauth_google", redirectUrl: "/dashboard", redirectCallbackUrl: "/sso-callback" });
      if (error) { setFailed(true); setBusy(false); sending.current = false; }
    } catch { setFailed(true); setBusy(false); sending.current = false; }
  }
  return <div className="home-google"><Button variant="outline" disabled={!loaded || busy || fetchStatus === "fetching"} onClick={() => void start()}>
    <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.59 4.59 0 0 1-1.99 3.01v2.5h3.22c1.88-1.73 2.99-4.27 2.99-7.33Z"/><path fill="#34A853" d="M12 22c2.69 0 4.94-.89 6.59-2.44l-3.22-2.5c-.9.6-2.04.96-3.37.96-2.6 0-4.8-1.76-5.59-4.12H3.09v2.58A9.96 9.96 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.9a6 6 0 0 1 0-3.8V7.52H3.09a10 10 0 0 0 0 8.96l3.32-2.58Z"/><path fill="#EA4335" d="M12 5.98c1.46 0 2.77.5 3.8 1.49l2.85-2.85A9.57 9.57 0 0 0 12 2a9.96 9.96 0 0 0-8.91 5.52l3.32 2.58C7.2 7.74 9.4 5.98 12 5.98Z"/></svg>
    {busy ? "Conectando con Google…" : "Iniciar con Google"}
  </Button>{failed && <p role="alert">No pudimos conectar. <Link href="/sign-in">Continúa desde Iniciar sesión.</Link></p>}</div>;
}
