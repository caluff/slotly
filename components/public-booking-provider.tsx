"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useState, type ReactNode } from "react";

export function PublicBookingProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("Falta configurar NEXT_PUBLIC_CONVEX_URL.");
    return new ConvexReactClient(url);
  });
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
