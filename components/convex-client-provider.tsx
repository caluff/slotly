"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithAuth, ConvexReactClient, useConvexAuth } from "convex/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clerkTokenFetcher } from "@/lib/convex-clerk-token-fetcher";

const AuthRecoveryContext = createContext<{ version: number; retry: () => void } | null>(null);

function useAuthRecovery() {
  const recovery = useContext(AuthRecoveryContext);
  if (!recovery) throw new Error("Falta el proveedor de recuperación de acceso.");
  return recovery;
}

export function useRetryConvexAuth() {
  return useAuthRecovery().retry;
}

function useClerkAuthForConvex() {
  const { isLoaded, isSignedIn, getToken, userId, sessionId, orgId, orgRole, sessionClaims } = useAuth();
  const { version } = useAuthRecovery();
  const usesSessionToken = sessionClaims?.aud === "convex";
  const fetchAccessToken = useMemo(
    () => clerkTokenFetcher(getToken, usesSessionToken, version > 0),
    // Auth identity changes must invalidate the fetcher even if getToken is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getToken, usesSessionToken, userId, sessionId, orgId, orgRole, version],
  );
  return { isLoading: !isLoaded, isAuthenticated: isSignedIn ?? false, fetchAccessToken };
}

function ResumeAuthentication() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isSignedIn } = useAuth();
  const retry = useRetryConvexAuth();
  useEffect(() => {
    if (isLoading || isAuthenticated || !isSignedIn) return;
    function resume() {
      if (navigator.onLine && document.visibilityState !== "hidden") retry();
    }
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [isLoading, isAuthenticated, isSignedIn, retry]);
  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("Falta configurar NEXT_PUBLIC_CONVEX_URL.");
    return new ConvexReactClient(url);
  });
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => setVersion((value) => value + 1), []);
  const recovery = useMemo(() => ({ version, retry }), [version, retry]);

  return (
    <AuthRecoveryContext.Provider value={recovery}>
      <ConvexProviderWithAuth client={client} useAuth={useClerkAuthForConvex}>
        <ResumeAuthentication />
        {children}
      </ConvexProviderWithAuth>
    </AuthRecoveryContext.Provider>
  );
}
