"use client";

import type { CSSProperties, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { PublicBookingDate } from "@/components/public-booking-date";
import { publicPhoneHref, publicThemeStyle, type PublicAppearanceView } from "@/lib/public-appearance";
import "@/components/public-booking-presentation.css";

export type ReservationFields = { serviceId: string; date: string; start: string; clientName: string; email: string };
export function PublicBookingSurface({ businessName, timeZone, appearance, children }: { businessName: string; timeZone: string; appearance: PublicAppearanceView; children: ReactNode }) {
  const { settings, photoUrl } = appearance;
  return <section className="public-booking-surface" style={publicThemeStyle(settings.theme) as CSSProperties}>
    <header className="public-booking-heading">
      {/* URLs are issued by owned Convex storage; no external image hosts or tracking pixels. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- Owned uploaded images, rendered identically in live page and local draft. */}
      {settings.showPhoto && photoUrl && <img src={photoUrl} alt={settings.professionalName || businessName} width={80} height={80} className="public-portrait" />}
      <div className="min-w-0"><h1 className="workspace-title wrap-anywhere">{settings.publicName || businessName}</h1>
        {settings.professionalName && <p className="mt-2 font-medium wrap-anywhere">{settings.professionalName}</p>}
        <p className="mt-2 text-sm text-muted wrap-anywhere">{timeZone}</p></div>
    </header>
    {settings.welcome && <p className="public-welcome">{settings.welcome}</p>}
    {(settings.showPhone && settings.phone || settings.address) && <address className="public-contact">
      {settings.showPhone && settings.phone && <a className="text-link text-accent" href={publicPhoneHref(settings.phone)}>{settings.phone}</a>}
      {settings.address && <span>{settings.address}</span>}
    </address>}
    {children}
  </section>;
}

type Props = {
  prefix?: string; fields: ReservationFields; change: (field: keyof ReservationFields, value: string) => void;
  services: { id: string; name: string; durationMinutes: number }[]; servicesLoading?: boolean; serviceHelp?: ReactNode; fallbackService?: { id: string; label: string };
  starts: { value: string; label: string; disabled?: boolean }[]; startPlaceholder?: string; startDisabled?: boolean; startHelp?: ReactNode;
  timeZone: string; datePicker: "native" | "calendar"; invalid?: keyof ReservationFields | null; errorId?: string;
};
// The editor preview and the booking route use these exact controls. Submission,
// recovery, authoritative availability and receipts remain in PublicBooking.
export function PublicReservationFields({ prefix = "public", fields, change, services, servicesLoading, serviceHelp, fallbackService, starts, startPlaceholder = "Elige un horario", startDisabled, startHelp, timeZone, datePicker, invalid, errorId = "booking-error" }: Props) {
  return <>
    <div className="grid gap-2 [&>[data-slot=native-select-wrapper]]:w-full"><Label htmlFor={`${prefix}-service`}>Servicio</Label>
      <NativeSelect id={`${prefix}-service`} name="serviceId" value={fields.serviceId} onChange={event => change("serviceId", event.target.value)} className="w-full" required aria-invalid={invalid === "serviceId"} aria-describedby={invalid === "serviceId" ? errorId : undefined}>
        <option value="">{servicesLoading ? "Cargando servicios…" : "Elige un servicio"}</option>
        {fallbackService && <option value={fallbackService.id}>{fallbackService.label}</option>}
        {services.map(service => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min</option>)}
      </NativeSelect>{serviceHelp}
    </div>
    <div className="grid gap-2"><Label htmlFor={`${prefix}-date`}>Fecha</Label><PublicBookingDate id={`${prefix}-date`} value={fields.date} onChange={value => change("date", value)} mode={datePicker} timeZone={timeZone} invalid={invalid === "date"} errorId={errorId} /></div>
    <div className="grid gap-2 [&>[data-slot=native-select-wrapper]]:w-full"><Label htmlFor={`${prefix}-start`}>Horario disponible</Label>
      <NativeSelect id={`${prefix}-start`} name="start" value={fields.start} onChange={event => change("start", event.target.value)} className="w-full" required disabled={startDisabled} aria-invalid={invalid === "start"} aria-describedby={invalid === "start" ? errorId : undefined}>
        <option value="">{startPlaceholder}</option>{starts.map(slot => <option key={slot.value} value={slot.value} disabled={slot.disabled}>{slot.label}</option>)}
      </NativeSelect>{startHelp}
    </div>
    <div className="grid gap-2"><Label htmlFor={`${prefix}-name`}>Tu nombre</Label><Input id={`${prefix}-name`} name="clientName" autoComplete="name" maxLength={100} value={fields.clientName} onChange={event => change("clientName", event.target.value)} required aria-invalid={invalid === "clientName"} aria-describedby={invalid === "clientName" ? errorId : undefined} /></div>
    <div className="grid gap-2"><Label htmlFor={`${prefix}-email`}>Correo electrónico</Label><Input id={`${prefix}-email`} name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={fields.email} onChange={event => change("email", event.target.value)} required aria-invalid={invalid === "email"} aria-describedby={invalid === "email" ? errorId : undefined} /></div>
  </>;
}
