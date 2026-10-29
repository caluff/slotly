import { AuthShell } from "@/components/auth-shell";
import { Brand } from "@/components/brand";
import { FormSkeleton } from "@/components/loading-screens";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthPageLoading() {
  return <AuthShell label="Acceso a Slotly"><FormSkeleton compact /></AuthShell>;
}

export function PublicPageLoading() {
  return <>
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-6 sm:px-8"><Brand /><ThemeToggle /></header>
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-4 sm:px-8 sm:pt-8"><FormSkeleton /></main>
  </>;
}
