"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { ExternalLink, MapPin, Phone } from "@/components/ui/icons";
import { PublicBookingDate, type BookingDaysLoader } from "@/components/public-booking-date";
import { formatLocalDate } from "@/lib/agenda-date";
import { publicPhoneHref, publicThemeStyle, publicWebsiteHref, type PublicAppearanceView } from "@/lib/public-appearance";
import "@/components/public-booking-presentation.css";

export type ReservationFields = { serviceId: string; date: string; start: string; clientName: string; email: string };
export function PublicBookingSurface({ businessName, appearance, children }: { businessName: string; appearance: PublicAppearanceView; children: ReactNode }) {
  const { settings, photoUrl } = appearance;
  const phone = settings.showPhone ? publicPhoneHref(settings.phone) : undefined;
  const website = publicWebsiteHref(settings.website);
  return <section className="public-booking-surface" style={publicThemeStyle(settings.theme) as CSSProperties}>
    <header className="public-profile" data-layout={settings.profileLayout ?? "inline"} data-style={settings.headerStyle ?? "plain"}>
      <div className="public-profile-intro">
        <div className="public-booking-heading">
          {/* eslint-disable-next-line @next/next/no-img-element -- Owned Convex photo or a local draft. */}
          {settings.showPhoto && photoUrl && <img src={photoUrl} alt={settings.professionalName || businessName} width={80} height={80} className="public-portrait" />}
          <div className="min-w-0">
            <h1 className="public-booking-title wrap-anywhere">{settings.publicName || businessName}</h1>
            {(settings.tagline || settings.professionalName) && <p className="public-profile-meta">
              {settings.tagline && <span className="font-medium text-accent">{settings.tagline}</span>}
              {settings.professionalName && <span>{settings.professionalName}</span>}
            </p>}
          </div>
        </div>
        {settings.welcome && <p className="public-welcome">{settings.welcome}</p>}
      </div>
      {(phone || settings.address || website) && <address className="public-contact">
        {settings.address && <span className="public-contact-address"><MapPin aria-hidden="true" /><span>{settings.address}</span></span>}
        {(phone || website) && <div className="public-contact-actions">
          {phone && <a className="public-contact-link" href={phone}><Phone aria-hidden="true" /><span>{formatPhoneNumberIntl(settings.phone) || settings.phone}</span></a>}
          {website && <a className="public-contact-link" href={website} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />Sitio web<span className="sr-only"> (abre en otra pestaña)</span></a>}
        </div>}
      </address>}
    </header>
    {children}
  </section>;
}

export function PublicReservationIntro({ note }: { note?: string }) {
  return <div className="mb-6">
    <h2 className="text-xl font-semibold tracking-tight">Reservar cita</h2>
    {note && <p className="public-booking-note">{note}</p>}
  </div>;
}

type Props = {
  prefix?: string; fields: ReservationFields; change: (field: keyof ReservationFields, value: string) => void;
  services: { id: string; name: string; durationMinutes: number }[]; servicesLoading?: boolean; serviceHelp?: ReactNode; fallbackService?: { id: string; label: string };
  starts: { value: string; label: string; disabled?: boolean }[]; startPlaceholder?: string; startDisabled?: boolean; startHelp?: ReactNode;
  timeZone: string; invalid?: keyof ReservationFields | null; errorId?: string;
  loadDays?: BookingDaysLoader; recovering?: boolean;
};
// The editor preview and the booking route use these exact controls. Submission,
// recovery, authoritative availability and receipts remain in PublicBooking.
export function PublicReservationFields({ prefix = "public", fields, change, services, servicesLoading, serviceHelp, fallbackService, starts, startPlaceholder = "Elige un horario", startDisabled, startHelp, timeZone, invalid, errorId = "booking-error", loadDays, recovering }: Props) {
  return <>
    <div className="grid gap-2 [&>[data-slot=native-select-wrapper]]:w-full"><Label htmlFor={`${prefix}-service`}>Servicio</Label>
      <NativeSelect id={`${prefix}-service`} name="serviceId" value={fields.serviceId} onChange={event => change("serviceId", event.target.value)} className="w-full" required aria-invalid={invalid === "serviceId"} aria-describedby={invalid === "serviceId" ? errorId : undefined}>
        <option value="">{servicesLoading ? "Cargando servicios…" : "Elige un servicio"}</option>
        {fallbackService && <option value={fallbackService.id}>{fallbackService.label}</option>}
        {services.map(service => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min</option>)}
      </NativeSelect>{serviceHelp}
    </div>
    <div className="public-reservation-schedule">
      <div className="public-reservation-date">
        {recovering ? <>
          <span className="text-sm font-medium">Fecha</span>
          <time dateTime={fields.date} className="text-sm text-muted">{formatLocalDate(fields.date)}</time>
        </> : <>
          <Label htmlFor={`${prefix}-date`}>Fecha</Label>
          <PublicBookingDate id={`${prefix}-date`} value={fields.date} onChange={value => change("date", value)} timeZone={timeZone} invalid={invalid === "date"} errorId={errorId} availabilityKey={fields.serviceId} loadDays={loadDays} />
        </>}
      </div>
      <fieldset id={`${prefix}-start`} name="start" tabIndex={-1} className="public-reservation-time" disabled={startDisabled} aria-busy={!!fields.date && startDisabled} aria-invalid={invalid === "start"} aria-describedby={invalid === "start" ? errorId : undefined}>
        <legend>Horario disponible</legend>
        {!fields.date || startDisabled || !starts.length
          ? <p role="status" className="public-time-placeholder">{!fields.date ? "Elige un día disponible en el calendario." : startDisabled ? startPlaceholder : "Sin horarios disponibles."}</p>
          : <PublicTimeChoices starts={starts} selected={fields.start} timeZone={timeZone} onSelect={value => change("start", value)} />}
        {startHelp}
      </fieldset>
    </div>
    <fieldset className="public-reservation-contact"><legend>Tus datos</legend><div className="public-contact-fields">
      <div className="grid gap-2"><Label htmlFor={`${prefix}-name`}>Tu nombre</Label><Input id={`${prefix}-name`} name="clientName" autoComplete="name" maxLength={100} value={fields.clientName} onChange={event => change("clientName", event.target.value)} required aria-invalid={invalid === "clientName"} aria-describedby={invalid === "clientName" ? errorId : undefined} /></div>
      <div className="grid gap-2"><Label htmlFor={`${prefix}-email`}>Correo electrónico</Label><Input id={`${prefix}-email`} name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={fields.email} onChange={event => change("email", event.target.value)} required aria-invalid={invalid === "email"} aria-describedby={invalid === "email" ? errorId : undefined} /></div>
    </div></fieldset>
  </>;
}

type TimePeriod = "Mañana" | "Tarde" | "Noche";

function PublicTimeChoices({ starts, selected, timeZone, onSelect }: { starts: Props["starts"]; selected: string; timeZone: string; onSelect: (value: string) => void }) {
  const [period, setPeriod] = useState<TimePeriod | null>(null);
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const groups: Record<TimePeriod, (Props["starts"][number] & { time: string })[]> = { Mañana: [], Tarde: [], Noche: [] };
  for (const slot of starts) {
    const startTime = time.format(Number(slot.value));
    const hour = Number(startTime.slice(0, 2));
    groups[hour < 12 ? "Mañana" : hour < 18 ? "Tarde" : "Noche"].push({ ...slot, time: startTime });
  }
  const periods = (Object.keys(groups) as TimePeriod[]).filter(key => groups[key].length);
  const active = period && groups[period].length ? period : periods.find(key => groups[key].some(slot => slot.value === selected)) ?? periods[0];
  const chosen = starts.find(slot => slot.value === selected);
  return <>
    {periods.length > 1 && <SegmentedControl aria-label="Franja horaria" value={active} onValueChange={setPeriod} className="public-time-periods">
      <SegmentedControlIndicator />
      {periods.map(key => <SegmentedControlItem key={key} value={key}>{key}</SegmentedControlItem>)}
    </SegmentedControl>}
    <div className="public-time-grid">
      {groups[active].map(slot => <label key={slot.value} className="public-time-option">
        <input type="radio" name="start" value={slot.value} checked={selected === slot.value} onChange={() => onSelect(slot.value)} disabled={slot.disabled} aria-label={slot.disabled ? `${slot.time}, ${slot.label}` : slot.label} />
        <span>{slot.time}</span>
      </label>)}
    </div>
    {chosen && <p className="public-time-selected" role="status">{chosen.disabled ? chosen.label : <>Horario elegido <strong>{chosen.label}</strong></>}</p>}
  </>;
}
