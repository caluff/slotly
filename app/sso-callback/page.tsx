"use client";

import { HandleSSOCallback } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { FormSkeleton } from "@/components/loading-screens";

export default function SSOCallbackPage() {
  const router = useRouter();
  return <SiteShell><main id="main-content" className="auth-frame"><div className="w-full max-w-sm"><FormSkeleton compact /></div><HandleSSOCallback
    navigateToApp={({ session, decorateUrl }) => {
      const destination = decorateUrl(session?.currentTask ? "/sign-in" : "/dashboard");
      if (destination.startsWith("http")) window.location.assign(destination);
      else router.replace(destination);
    }}
    navigateToSignIn={() => router.replace("/sign-in")}
    navigateToSignUp={() => router.replace("/sign-up")}
  /></main></SiteShell>;
}
