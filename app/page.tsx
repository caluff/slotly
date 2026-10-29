import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ParticleFilm } from "@/components/particle-film";
import { HomeProduct } from "@/components/home-product";
import { Button } from "@/components/ui/button";
import "./home.css";

export default function Home() {
  return <div className="home-page">
    <a href="#main-content" className="home-skip">Saltar al contenido</a>
    <header className="home-header"><Brand /><nav aria-label="Acceso"><Link href="/demo" prefetch={false}>Ver demo</Link><Suspense fallback={<Link href="/sign-in">Iniciar sesión</Link>}><AccountNavigation /></Suspense></nav></header>
    <main id="main-content">
      <section className="home-hero" aria-labelledby="home-heading">
        <ParticleFilm />
        <div className="home-copy">
          <h1 id="home-heading">Tu agenda.<br />Con otra <em>calma.</em></h1>
          <p>Un hueco para cada cita. Más espacio para lo que haces bien.</p>
          <div className="home-actions"><Button asChild><Link href="/demo" prefetch={false}>Ver demo <HomeArrow diagonal /></Link></Button><Suspense fallback={<Button variant="outline" asChild><Link href="/sign-in">Iniciar con Google</Link></Button>}><HomeAccess /></Suspense></div>
        </div>
      </section>
      <HomeProduct />
    </main>
    <footer className="home-footer"><p>Slotly · Tu tiempo cuenta.</p><Link href="/demo" prefetch={false}>Pruébalo sin crear una cuenta <HomeArrow diagonal /></Link></footer>
  </div>;
}

async function AccountNavigation() {
  const { isAuthenticated } = await auth();
  return isAuthenticated ? <><Link href="/dashboard" prefetch={false}>Mi agenda</Link><UserButton /></> : <Link href="/sign-in">Iniciar sesión</Link>;
}

async function HomeAccess() {
  const { isAuthenticated } = await auth();
  return isAuthenticated ? <Button variant="outline" asChild><Link href="/dashboard" prefetch={false}>Ir a mi agenda</Link></Button> : <GoogleSignInButton />;
}

function HomeArrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg className="home-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M5 12h14m-6-6 6 6-6 6"} /></svg>;
}
