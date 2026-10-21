"use client";

import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CalendarCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { appointmentSchema } from "@/lib/appointment-schema";
import { isLocalDate } from "@/lib/local-date";

type Fields = { serviceId: string; date: string; start: string; clientName: string };
type Attempt = { attemptKey: string; serviceId: Id<"services">; date: string; start: number; clientName: string };
type Receipt = Extract<FunctionReturnType<typeof api.publicBooking.confirm>, { ok: true }>["receipt"];
type Slot = { start: number; end: number; startTime: string; endTime: string };
const blank: Fields = { serviceId: "", date: "", start: "", clientName: "" };

export function PublicBooking({ slug }: { slug: string }) {
  const business = useQuery(api.publicBooking.getBusiness, { slug });
  const services = usePaginatedQuery(api.publicBooking.listServices, business ? { slug } : "skip", { initialNumItems: 30 });
  const availability = useAction(api.publicBooking.getAvailability);
  const confirm = useMutation(api.publicBooking.confirm);
  const [fields, setFields] = useState<Fields>(blank);
  const [pending, setPending] = useState<Attempt | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<keyof Fields | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [options, setOptions] = useState<{ key: string; slots: Slot[]; error: string }>({ key: "", slots: [], error: "" });
  const lock = useRef(false);
  const alert = useRef<HTMLParagraphElement>(null);
  const success = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const storageKey = `slotly:public-booking:${slug}`;
  useEffect(() => {
    if (!error || busy) return;
    if (invalid) form.current?.querySelector<HTMLElement>(`[name="${invalid}"]`)?.focus();
    else alert.current?.focus();
  }, [error, busy, invalid, business, restored]);
  useEffect(() => { if (receipt) success.current?.focus(); }, [receipt]);

  useEffect(() => {
    // A nonce is an idempotency capability, never a login/session token. Only
    // this tab's unfinished attempt is stored; it survives a lost response/reload.
    const frame = requestAnimationFrame(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        const attempt: Attempt | null = raw ? JSON.parse(raw) : null;
        if (attempt && typeof attempt.attemptKey === "string" && typeof attempt.serviceId === "string"
          && isLocalDate(attempt.date) && Number.isSafeInteger(attempt.start) && typeof attempt.clientName === "string") {
          setPending(attempt);
          setFields({ ...attempt, start: String(attempt.start) });
          setError("Hay una confirmación sin respuesta en esta pestaña. Reintenta para comprobar el mismo intento.");
        }
      } catch { /* Storage is optional; in-tab retries retain the same nonce. */ }
      setRestored(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  const queryKey = `${fields.serviceId}:${fields.date}`;
  const canQuery = !!business && !!fields.serviceId && isLocalDate(fields.date) && !receipt;
  useEffect(() => {
    if (!canQuery) return;
    let alive = true;
    let sequence = 0;
    async function fetchOptions() {
      const request = ++sequence;
      try {
        const result = await availability({ slug, serviceId: fields.serviceId as Id<"services">, date: fields.date });
        if (alive && request === sequence) setOptions({ key: queryKey, slots: result?.slots ?? [],
          error: result === null ? "El servicio o el enlace ya no está disponible." : "" });
      } catch {
        if (alive && request === sequence) setOptions({ key: queryKey, slots: [], error: "No pudimos cargar los horarios. Reintenta." });
      }
    }
    void fetchOptions();
    const interval = window.setInterval(fetchOptions, 30_000);
    window.addEventListener("focus", fetchOptions);
    return () => { alive = false; window.clearInterval(interval); window.removeEventListener("focus", fetchOptions); };
  }, [availability, canQuery, fields.serviceId, fields.date, queryKey, refresh, slug]);

  function change(field: keyof Fields, value: string) {
    setFields((old) => ({ ...old, [field]: value, ...(field === "serviceId" || field === "date" ? { start: "" } : {}) }));
    setInvalid(null); setError("");
  }
  function fail(message: string, field: keyof Fields | null = null) {
    setError(message); setInvalid(field);
  }
  const readyOptions = canQuery && options.key === queryKey;
  const slots = readyOptions ? options.slots : [];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !business) return;
    if (!pending) {
      if (!fields.serviceId) return fail("Elige un servicio.", "serviceId");
      if (!isLocalDate(fields.date)) return fail("Elige una fecha válida.", "date");
      if (!readyOptions || !slots.some((slot) => String(slot.start) === fields.start)) return fail("Elige un horario disponible.", "start");
      if (!appointmentSchema.safeParse(fields).success) return fail("Escribe un nombre válido de entre 1 y 100 caracteres.", "clientName");
    }
    const attempt = pending ?? { attemptKey: crypto.randomUUID(), serviceId: fields.serviceId as Id<"services">,
      date: fields.date, start: Number(fields.start), clientName: fields.clientName };
    lock.current = true; setBusy(true); setError(""); setInvalid(null); setPending(attempt);
    try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); } catch { /* optional persistence */ }
    try {
      const result = await confirm({ ...attempt, slug });
      if (result.ok) {
        setReceipt(result.receipt);
        // Retain the attempt in this tab's storage. Reload offers an identical
        // replay instead of silently presenting a fresh duplicate booking form.
      } else {
        // RATE_LIMITED may follow a lost successful reply. Keep the capability
        // until the same attempt has a definitive response after the cooldown.
        if (result.code !== "RATE_LIMITED" && result.code !== "UNAVAILABLE") {
          setPending(null);
          try { sessionStorage.removeItem(storageKey); } catch { /* optional storage */ }
        }
        if (result.code === "RATE_LIMITED") fail(`Demasiados intentos para este negocio. Reintenta en ${Math.max(1, Math.ceil((result.retryAfter ?? 6000) / 1000))} segundos.`);
        else if (result.code === "UNAVAILABLE") fail("Este enlace no está disponible. Contacta con el negocio.");
        else if (result.code === "SLOT_TAKEN" || result.code === "SLOT_UNAVAILABLE") {
          fail("Ese horario ya no está disponible. Actualizamos las opciones; elige otro.", "start");
          setRefresh((value) => value + 1);
        } else if (result.code === "INVALID_CLIENT_NAME") fail("Escribe un nombre válido de entre 1 y 100 caracteres.", "clientName");
        else if (result.code === "INVALID_DATE") fail("Elige una fecha válida.", "date");
        else if (result.code === "SERVICE_NOT_FOUND") fail("El servicio ya no está disponible. Elige otro.", "serviceId");
        else fail("No pudimos confirmar este intento. Comprueba los datos y reintenta.");
      }
    } catch {
      fail("No recibimos la respuesta. Reintenta la misma confirmación para comprobarla sin duplicar la cita.");
    } finally { lock.current = false; setBusy(false); }
  }

  if (business === undefined || !restored) return <p role="status" className="text-muted">Cargando reservas…</p>;
  if (!business) return <section><h1 className="workspace-title">Enlace no disponible</h1>
    <p role="status" className="mt-4 text-muted">Comprueba la dirección o contacta con el negocio.</p></section>;
  return <section>
    <h1 className="workspace-title wrap-anywhere">{business.name}</h1>
    <p className="mt-2 text-sm text-muted wrap-anywhere">{business.timeZone}</p>
    {receipt ? <div className="mt-8 border-y border-line py-6">
      <CalendarCheck aria-hidden="true" className="mb-4 size-7 text-accent" />
      <h2 ref={success} tabIndex={-1} className="text-xl font-semibold tracking-tight">Cita confirmada</h2>
      <p className="mt-4 font-medium wrap-anywhere">{receipt.serviceName}</p>
      <p className="mt-1">{new Intl.DateTimeFormat("es-UY", { dateStyle: "full", timeZone: receipt.timeZone }).format(receipt.start)}</p>
      <p className="mt-1 tabular-nums">{new Intl.DateTimeFormat("es-UY", { timeStyle: "short", timeZone: receipt.timeZone }).format(receipt.start)} – {new Intl.DateTimeFormat("es-UY", { timeStyle: "short", timeZone: receipt.timeZone }).format(receipt.end)}</p>
    </div> : <form ref={form} onSubmit={submit} noValidate aria-label="Reservar cita" aria-busy={busy} className="mt-8">
      <h2 className="mb-6 text-xl font-semibold tracking-tight">Reservar cita</h2>
      <fieldset disabled={busy || !!pending} className="grid gap-5">
        <legend className="sr-only">Datos de la reserva</legend>
        <div className="grid gap-2 [&>[data-slot=native-select-wrapper]]:w-full">
          <Label htmlFor="public-service">Servicio</Label>
          <NativeSelect id="public-service" name="serviceId" value={fields.serviceId} onChange={(e) => change("serviceId", e.target.value)}
            className="w-full" required aria-invalid={invalid === "serviceId"} aria-describedby={invalid === "serviceId" ? "booking-error" : undefined}>
            <option value="">{services.status === "LoadingFirstPage" ? "Cargando servicios…" : "Elige un servicio"}</option>
            {fields.serviceId && !services.results.some((s) => s.id === fields.serviceId) && <option value={fields.serviceId}>Servicio elegido</option>}
            {services.results.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.durationMinutes} min</option>)}
          </NativeSelect>
          {services.status === "Exhausted" && !services.results.length && <p role="status" className="text-sm text-muted">No hay servicios disponibles.</p>}
          {(services.status === "CanLoadMore" || services.status === "LoadingMore") && <Button type="button" variant="outline"
            disabled={services.status !== "CanLoadMore"} onClick={() => services.loadMore(30)}>{services.status === "LoadingMore" ? "Cargando…" : "Ver más servicios"}</Button>}
        </div>
        <div className="grid gap-2"><Label htmlFor="public-date">Fecha</Label>
          <Input id="public-date" name="date" type="date" value={fields.date} onChange={(e) => change("date", e.target.value)} required
            aria-invalid={invalid === "date"} aria-describedby={invalid === "date" ? "booking-error" : undefined} /></div>
        <div className="grid gap-2 [&>[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="public-start">Horario disponible</Label>
          <NativeSelect id="public-start" name="start" value={fields.start} onChange={(e) => change("start", e.target.value)} className="w-full"
            disabled={!canQuery || !readyOptions} required aria-invalid={invalid === "start"} aria-describedby={invalid === "start" ? "booking-error" : undefined}>
            <option value="">{canQuery && !readyOptions ? "Cargando horarios…" : "Elige un horario"}</option>
            {fields.start && !slots.some((s) => String(s.start) === fields.start) && <option value={fields.start} disabled>Horario elegido no disponible</option>}
            {slots.map((s) => <option key={s.start} value={s.start}>{s.startTime} – {s.endTime}</option>)}
          </NativeSelect>
          {canQuery && !readyOptions && <p role="status" className="text-sm text-muted">Cargando horarios…</p>}
          {readyOptions && options.error ? <div><p role="alert" className="text-sm text-destructive">{options.error}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => setRefresh((value) => value + 1)}>Reintentar horarios</Button></div>
            : readyOptions && !slots.length && <p role="status" className="text-sm text-muted">No hay horarios disponibles para esta fecha.</p>}
        </div>
        <div className="grid gap-2"><Label htmlFor="public-name">Tu nombre</Label>
          <Input id="public-name" name="clientName" autoComplete="name" maxLength={100} value={fields.clientName}
            onChange={(e) => change("clientName", e.target.value)} required aria-invalid={invalid === "clientName"}
            aria-describedby={invalid === "clientName" ? "booking-error" : undefined} /></div>
      </fieldset>
      {error && <p ref={alert} id="booking-error" role="alert" tabIndex={-1} className="mt-5 text-sm leading-6 text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="mt-6 w-full sm:w-auto">{busy ? "Confirmando…" : pending ? "Reintentar confirmación" : "Confirmar cita"}</Button>
    </form>}
  </section>;
}
