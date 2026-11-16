"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Dialog, DialogBackdrop, DialogContent, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import agendaImage from "@/public/media/product/agenda.jpg";
import clientsImage from "@/public/media/product/clientes.jpg";
import servicesImage from "@/public/media/product/servicios.jpg";

const features = [
  {
    id: "agenda", label: "Agenda", title: "Tu semana, de un vistazo.",
    description: "Consulta tus citas por día, semana o mes. Crea una nueva, cambia su horario o cancélala sin perder de vista el resto de tu agenda.",
    image: agendaImage, alt: "Calendario semanal de Slotly con citas de ejemplo, filtros por cliente, servicio y estado.",
    href: "/demo", action: "Probar la agenda",
  },
  {
    id: "clientes", label: "Clientes", title: "Cada cliente tiene su historia.",
    description: "Encuentra sus datos y consulta todas sus citas desde su ficha. Cuando alguien vuelve a reservar con el mismo correo, Slotly reutiliza su perfil.",
    image: clientsImage, alt: "Listado de clientes ficticios de Slotly con sus nombres y correos.",
    href: "/demo?vista=clientes", action: "Explorar clientes",
  },
  {
    id: "servicios", label: "Servicios y horarios", title: "Tu negocio, a tu manera.",
    description: "Define tus servicios y su duración, configura tu semana de atención y bloquea los momentos que necesitas reservar para ti. Tus horarios disponibles siguen esas reglas.",
    image: servicesImage, alt: "Panel de servicios de Slotly con consultas de distintas duraciones junto al calendario.",
    href: "/demo?vista=servicios", action: "Probar servicios y horarios",
  },
];

export function HomeProduct() {
  return <section className="home-product" aria-label="Conoce Slotly">
    <h2 className="sr-only">Agenda, clientes y servicios en Slotly</h2>
    <StickyScroll content={features.map(feature => ({
      id: feature.id,
      title: feature.label,
      summary: feature.title,
      description: feature.description,
      content: <ProductScreenshot image={feature.image} alt={feature.alt} label={feature.label} />,
      action: <Link className="home-product-link" href={feature.href} prefetch={false}>{feature.action}<ProductArrow /></Link>,
    }))} />
  </section>;
}

function ProductScreenshot({ image, alt, label }: { image: StaticImageData; alt: string; label: string }) {
  return <Dialog>
    <figure className="home-product-figure">
      <DialogTrigger className="home-product-image" aria-label={`Ampliar captura de ${label}`}>
        <Image src={image} sizes="(max-width: 900px) calc(100vw - 48px), (max-width: 1432px) 60vw, 840px" alt={alt} />
        <span className="home-product-zoom" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4M10.5 7.5v6M7.5 10.5h6" /></svg></span>
      </DialogTrigger>
    </figure>

    <DialogBackdrop className="home-image-overlay" />
    <DialogContent className="home-image-dialog" initialFocus="content">
      <DialogTitle className="sr-only">Captura ampliada de {label}</DialogTitle>
      <Image src={image} alt={alt} unoptimized />
    </DialogContent>
  </Dialog>;
}

function ProductArrow() {
  return <svg className="home-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18 18 6M6 6h12v12" /></svg>;
}
