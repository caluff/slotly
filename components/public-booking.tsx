"use client";

import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CalendarCheck } from "@/components/ui/icons";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { PublicBookingSurface, PublicReservationFields } from "@/components/public-booking-presentation";
import { defaultPublicAppearance } from "@/lib/public-appearance";
import { clientEmailSchema } from "@/lib/client-email";
import { appointmentSchema } from "@/lib/appointment-schema";
import { isLocalDate } from "@/lib/local-date";
import { isManagementSecret, newManagementSecret } from "@/lib/public-management";
import { PublicManagementLink } from "@/components/public-management-link";

type Fields = { serviceId: string; date: string; start: string; clientName: string; email: string };
type ServiceContext = { name: string; durationMinutes: number; version: number };
type Attempt = { attemptKey: string; serviceId: Id<"services">; date: string; start: number; clientName: string; email?: string; expectedService?: ServiceContext; managementSecret?: string };
type Receipt = Extract<FunctionReturnType<typeof api.publicBooking.confirm>, { ok: true }>["receipt"];
type Slot = { start: number; end: number; startTime: string; endTime: string };
const blank: Fields = { serviceId: "", date: "", start: "", clientName: "", email: "" };

export function PublicBooking({ slug }: { slug: string }) {
  const business = useQuery(api.publicBooking.getBusiness, { slug });
  const appearance = useQuery(api.publicAppearance.getPublic, { slug });
  const services = usePaginatedQuery(api.publicBooking.listServices, business ? { slug } : "skip", { initialNumItems: 30 });
  const availability = useAction(api.publicBooking.getAvailability);
  const calendar = useAction(api.publicBooking.getAvailableDates);
  const confirm = useMutation(api.publicBooking.confirm);
  const [fields, setFields] = useState<Fields>(blank);
  const [pending, setPending] = useState<Attempt | null>(null);
  const [chosenContext, setChosenContext] = useState<ServiceContext | undefined>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [managementIssued, setManagementIssued] = useState(false);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<keyof Fields | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [options, setOptions] = useState<{ key: string; slots: Slot[]; error: string; service?: ServiceContext; revision?: string | null }>({ key: "", slots: [], error: "" });
  const lock = useRef(false);
  const alert = useRef<HTMLParagraphElement>(null);
  const success = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const storageKey = `slotly:public-booking:${slug}`;
  const loadDays = useCallback((month: string) => calendar({ slug, serviceId: fields.serviceId as Id<"services">, month }), [calendar, fields.serviceId, slug]);
  useEffect(() => {
    if (!error || busy) return;
    if (invalid) form.current?.querySelector<HTMLElement>(`[name="${invalid}"]`)?.focus();
    else alert.current?.focus();
  }, [error, busy, invalid, business, restored]);
  useEffect(() => { if (receipt) success.current?.focus(); }, [receipt]);

  useEffect(() => {
    // A frozen attempt survives a lost response/reload. Only new commands carry
    // a separate management capability; saved legacy commands are not upgraded.
    const frame = requestAnimationFrame(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        const attempt: Attempt | null = raw ? JSON.parse(raw) : null;
        if (attempt && typeof attempt.attemptKey === "string" && typeof attempt.serviceId === "string"
          && (attempt.email === undefined || clientEmailSchema.safeParse(attempt.email).success)
          && (attempt.managementSecret === undefined || isManagementSecret(attempt.managementSecret))
          && isLocalDate(attempt.date) && Number.isSafeInteger(attempt.start) && typeof attempt.clientName === "string") {
          setPending(attempt);
          setChosenContext(attempt.expectedService);
          setFields({ serviceId: attempt.serviceId, date: attempt.date, clientName: attempt.clientName, email: attempt.email ?? "", start: String(attempt.start) });
          setError("Recuperamos el intento guardado en esta pestaña. Reintenta para comprobar su confirmación.");
        }
      } catch { /* A new command still requires successful storage before send. */ }
      setRestored(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  const queryKey = `${fields.serviceId}:${fields.date}`;
  // Recovery replays the frozen command; current availability validates only a new booking.
  const canQuery = !!business && !!fields.serviceId && isLocalDate(fields.date) && !receipt && !pending;
  const revision = useQuery(api.publicBooking.getAvailabilityRevision, canQuery ? { slug, serviceId: fields.serviceId as Id<"services">, date: fields.date } : "skip");
  useEffect(() => {
    if (!canQuery) return;
    let alive = true;
    let sequence = 0;
    async function fetchOptions() {
      const request = ++sequence;
      try {
        const result = await availability({ slug, serviceId: fields.serviceId as Id<"services">, date: fields.date });
        if (alive && request === sequence) setOptions({ key: queryKey, slots: result?.slots ?? [], revision,
          service: result ? { name: result.service.name, durationMinutes: result.service.durationMinutes, version: result.service.version } : undefined,
          error: result === null ? "El servicio o el enlace ya no está disponible." : "" });
      } catch {
        if (alive && request === sequence) setOptions({ key: queryKey, slots: [], error: "No pudimos cargar los horarios. Reintenta." });
      }
    }
    void fetchOptions();
    const interval = window.setInterval(fetchOptions, 30_000);
    window.addEventListener("focus", fetchOptions);
    return () => { alive = false; window.clearInterval(interval); window.removeEventListener("focus", fetchOptions); };
  }, [availability, canQuery, fields.serviceId, fields.date, queryKey, refresh, slug, revision]);

  function change(field: keyof Fields, value: string) {
    if (field === "start") setChosenContext(options.service);
    setFields((old) => ({ ...old, [field]: value, ...(field === "serviceId" || field === "date" ? { start: "" } : {}), ...(field === "serviceId" ? { date: "" } : {}) }));
    setInvalid(null); setError("");
  }
  function fail(message: string, field: keyof Fields | null = null) {
    setError(message); setInvalid(field);
  }
  function anotherBooking() {
    // A deliberate new intention, never a replay or a side effect of reload.
    // Clear durably before releasing the confirmed command from this tab.
    try { sessionStorage.removeItem(storageKey); }
    catch { return fail("No pudimos preparar otra reserva. Habilita el almacenamiento de esta pestaña y reintenta."); }
    setPending(null); setReceipt(null); setManagementIssued(false); setChosenContext(undefined);
    setFields(blank); setInvalid(null); setError(""); setRefresh(value => value + 1);
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[name="serviceId"]')?.focus());
  }
  const readyOptions = canQuery && options.key === queryKey && options.revision === revision;
  const slots = readyOptions ? options.slots : [];
  const serviceChanged = !pending && !!chosenContext && !!fields.start && readyOptions && JSON.stringify(chosenContext) !== JSON.stringify(options.service);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !business) return;
    if (!pending) {
      if (!fields.serviceId) return fail("Elige un servicio.", "serviceId");
      if (!isLocalDate(fields.date)) return fail("Elige una fecha válida.", "date");
      if (!readyOptions || serviceChanged || !slots.some((slot) => String(slot.start) === fields.start)) return fail("Revisa el servicio y elige un horario disponible.", "start");
      if (!appointmentSchema.safeParse(fields).success) return fail("Escribe un nombre válido de entre 1 y 100 caracteres.", "clientName");
      if (!clientEmailSchema.safeParse(fields.email).success) return fail("Escribe un correo válido.", "email");
    }
    let attempt: Attempt;
    try { attempt = pending ?? { attemptKey: crypto.randomUUID(), managementSecret: newManagementSecret(), serviceId: fields.serviceId as Id<"services">,
      date: fields.date, start: Number(fields.start), clientName: fields.clientName, email: clientEmailSchema.parse(fields.email), expectedService: options.service }; }
    catch { return fail("No pudimos preparar la confirmación. Recarga la página antes de reintentar."); }
    try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); }
    catch { return fail("No podemos guardar el intento para recuperarlo tras recargar. Habilita el almacenamiento de esta pestaña antes de confirmar."); }
    lock.current = true; setBusy(true); setError(""); setInvalid(null); setPending(attempt);
    try {
      const result = await confirm({ ...attempt, slug });
      if (result.ok) {
        setReceipt(result.receipt);
        setManagementIssued(result.managementIssued === true);
        // Retain the attempt in this tab's storage. Reload offers an identical
        // replay instead of silently presenting a fresh duplicate booking form.
      } else {
        // RATE_LIMITED may follow a lost successful reply. Keep the capability
        // until the same attempt has a definitive response after the cooldown.
        if (result.code !== "RATE_LIMITED" && result.code !== "UNAVAILABLE" && result.code !== "ATTEMPT_CONFLICT") {
          setPending(null);
          try { sessionStorage.removeItem(storageKey); } catch { /* optional storage */ }
        }
        if (result.code === "RATE_LIMITED") fail(`Demasiados intentos para este negocio. Reintenta en ${Math.max(1, Math.ceil((result.retryAfter ?? 6000) / 1000))} segundos.`);
        else if (result.code === "UNAVAILABLE") fail("Este enlace no está disponible. Contacta con el negocio.");
        else if (result.code === "SERVICE_CHANGED" || result.code === "SERVICE_ARCHIVED") {
          fail("El servicio cambió. Revisa el nombre, la duración y los horarios antes de confirmar.", "serviceId");
          setFields(old => ({ ...old, start: "" })); setRefresh(value => value + 1);
        } else if (result.code === "SLOT_TAKEN" || result.code === "SLOT_UNAVAILABLE") {
          fail("Ese horario ya no está disponible. Actualizamos las opciones; elige otro.", "start");
          setRefresh((value) => value + 1);
        } else if (result.code === "INVALID_CLIENT_NAME") fail("Escribe un nombre válido de entre 1 y 100 caracteres.", "clientName");
        else if (result.code === "INVALID_CLIENT_EMAIL") fail("Escribe un correo válido.", "email");
        else if (result.code === "ATTEMPT_CONFLICT") fail("El contenido de este intento no coincide con su confirmación original. Conservamos el intento para revisarlo.");
        else if (result.code === "INVALID_DATE") fail("Elige una fecha válida.", "date");
        else if (result.code === "SERVICE_NOT_FOUND") fail("El servicio ya no está disponible. Elige otro.", "serviceId");
        else fail("No pudimos confirmar este intento. Comprueba los datos y reintenta.");
      }
    } catch {
      fail("No recibimos la respuesta. Reintenta la misma confirmación para comprobarla sin duplicar la cita.");
    } finally { lock.current = false; setBusy(false); }
  }

  if (business === undefined || appearance === undefined || !restored) return <p role="status" className="text-muted">Cargando reservas…</p>;
  if (!business) return <section><h1 className="workspace-title">Enlace no disponible</h1>
    <p role="status" className="mt-4 text-muted">Comprueba la dirección o contacta con el negocio.</p></section>;
  const time = new Intl.DateTimeFormat("es-UY", { timeStyle: "short", timeZone: business.timeZone });
  const pendingSlot = pending ? `${time.format(pending.start)}${pending.expectedService ? ` – ${time.format(pending.start + pending.expectedService.durationMinutes * 60_000)}` : ""}` : "";
  return <PublicBookingSurface businessName={business.name} timeZone={business.timeZone} appearance={appearance ?? { settings: defaultPublicAppearance, photoUrl: null }}>
    {receipt ? <div className="mt-8 border-y border-line py-6">
      <CalendarCheck aria-hidden="true" className="mb-4 size-7 text-accent" />
      <h2 ref={success} tabIndex={-1} className="text-xl font-semibold tracking-tight">Confirmación original</h2>
      <p className="mt-4 font-medium wrap-anywhere">{receipt.serviceName}</p>
      <p className="mt-1">{new Intl.DateTimeFormat("es-UY", { dateStyle: "full", timeZone: receipt.timeZone }).format(receipt.start)}</p>
      <p className="mt-1 tabular-nums">{new Intl.DateTimeFormat("es-UY", { timeStyle: "short", timeZone: receipt.timeZone }).format(receipt.start)} – {new Intl.DateTimeFormat("es-UY", { timeStyle: "short", timeZone: receipt.timeZone }).format(receipt.end)}</p>
      {managementIssued && <>
        <p className="mt-4 text-sm text-muted">Consulta el estado actual en Gestionar cita.</p>
        <PublicManagementLink secret={pending?.managementSecret} />
      </>}
      {error && <p ref={alert} role="alert" tabIndex={-1} className="mt-4 text-sm text-destructive">{error}</p>}
      <Button type="button" variant="outline" className="mt-5" onClick={anotherBooking}>Reservar otra cita</Button>
    </div> : <form ref={form} onSubmit={submit} noValidate aria-label="Reservar cita" aria-busy={busy} className="mt-8">
      <h2 className="mb-6 text-xl font-semibold tracking-tight">Reservar cita</h2>
      <fieldset disabled={busy || !!pending} className="grid gap-5">
        <legend className="sr-only">Datos de la reserva</legend>
        <PublicReservationFields fields={{ ...fields, start: serviceChanged ? "" : fields.start }} change={change} timeZone={business.timeZone} datePicker={(appearance?.settings ?? defaultPublicAppearance).datePicker} invalid={invalid} recovering={!!pending} loadDays={business && fields.serviceId && !pending ? loadDays : undefined}
          services={pending ? [] : services.results} servicesLoading={services.status === "LoadingFirstPage"}
          fallbackService={pending ? { id: pending.serviceId, label: pending.expectedService ? `${pending.expectedService.name} · ${pending.expectedService.durationMinutes} min` : "Servicio elegido" } : fields.serviceId && !services.results.some(s => s.id === fields.serviceId) ? { id: fields.serviceId, label: "Servicio elegido" } : undefined}
          serviceHelp={<>{!pending && services.status === "Exhausted" && !services.results.length && <p role="status" className="text-sm text-muted">No hay servicios disponibles.</p>}{!pending && (services.status === "CanLoadMore" || services.status === "LoadingMore") && <Button type="button" variant="outline" disabled={services.status !== "CanLoadMore"} onClick={() => services.loadMore(30)}>{services.status === "LoadingMore" ? "Cargando…" : "Ver más servicios"}</Button>}</>}
          starts={pending ? [{ value: String(pending.start), label: pendingSlot }] : [...(fields.start && !slots.some(s => String(s.start) === fields.start) ? [{ value: fields.start, label: "Horario elegido no disponible", disabled: true }] : []), ...slots.map(slot => ({ value: String(slot.start), label: `${slot.startTime} – ${slot.endTime}` }))]}
          startDisabled={!pending && (!canQuery || !readyOptions)} startPlaceholder={canQuery && !readyOptions ? "Cargando horarios…" : "Elige un horario"}
          startHelp={<>{serviceChanged && <p role="status" className="text-sm">El servicio cambió. Revisa su nombre y duración y vuelve a elegir un horario.</p>}{readyOptions && options.error ? <div><p role="alert" className="text-sm text-destructive">{options.error}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setRefresh(value => value + 1)}>Reintentar horarios</Button></div> : readyOptions && !slots.length && <p role="status" className="text-sm text-muted">No hay horarios disponibles para esta fecha.</p>}</>} />
      </fieldset>
      {error && <p ref={alert} id="booking-error" role="alert" tabIndex={-1} className="mt-5 text-sm leading-6 text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="mt-6 w-full sm:w-auto">{busy ? "Confirmando…" : pending ? "Reintentar confirmación" : "Confirmar cita"}</Button>
    </form>}
  </PublicBookingSurface>;
}
