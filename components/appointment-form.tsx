import { zodResolver } from "@hookform/resolvers/zod";
import { ConvexError } from "convex/values";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { appointmentSchema } from "@/lib/appointment-schema";
import { clientEmailSchema } from "@/lib/client-email";
import { privateCreationKey, type PrivateBookingCommand, type PrivateBookingResult } from "@/lib/appointment-creation";
import { useDraftWarning } from "@/components/use-draft-warning";
import { ClientPicker } from "@/components/client-picker";
import type { ClientSummary } from "@/components/client-creation-form";

export type AppointmentClientValues = PrivateBookingCommand;
const formSchema = appointmentSchema.extend({ email: z.string() });
type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;
type CreationContext = Pick<PrivateBookingCommand, "serviceId" | "date" | "expectedService">;
type Props = {
  storageKey: string; creationContext: CreationContext | null; serviceKey?: string; initialStart?: number;
  draft?: AppointmentDraft; onDraftChange?: (draft: AppointmentDraft) => void;
  onCheck?: (command: PrivateBookingCommand) => Promise<"found" | "absent">; onRecovered?: () => void;
  selectionFields?: ReactNode; compact?: boolean; slots: { start: number; startTime: string; endTime: string }[];
  ready: boolean; isFuture: (start: number) => boolean;
  onCreate: (command: PrivateBookingCommand) => Promise<PrivateBookingResult>;
  timeZone?: string; onRefresh: () => void; onSaving: (saving: boolean) => void;
};
export type AppointmentDraft = { start: string; clientName: string; email?: string; uncertain?: boolean;
  clientMode?: "free" | "saved"; client?: ClientSummary | null; serviceKey?: string; pending?: PrivateBookingCommand };

export function AppointmentForm({ storageKey, creationContext, slots, ready, isFuture, onCreate, onRefresh, onSaving,
  initialStart, draft, onDraftChange, onCheck, onRecovered, selectionFields, serviceKey, timeZone = "UTC", compact = false }: Props) {
  const [clientMode, setClientMode] = useState<"free" | "saved">(draft?.clientMode ?? "free");
  const [client, setClient] = useState<ClientSummary | null>(draft?.client ?? null);
  const [pending, setPending] = useState<PrivateBookingCommand | null>(draft?.pending ?? null);
  const [legacyUncertain, setLegacyUncertain] = useState(!!draft?.uncertain && !draft?.pending);
  const [checkedAbsent, setCheckedAbsent] = useState(false), [checking, setChecking] = useState(false), [retrying, setRetrying] = useState(false);
  const [recovery, setRecovery] = useState(draft?.pending ? "Hay una confirmación pendiente. Comprueba el intento antes de continuar." : "");
  const form = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(formSchema),
    defaultValues: { start: draft?.start ?? "", clientName: draft?.clientName ?? "", email: draft?.email ?? "" }, shouldFocusError: false });
  const { isSubmitting, submitCount, errors } = form.formState;
  const selected = useWatch({ control: form.control, name: "start" });
  const clientName = useWatch({ control: form.control, name: "clientName" });
  const email = useWatch({ control: form.control, name: "email" });
  const valid = appointmentSchema.safeParse({ start: selected, clientName }).success
    && (clientMode === "saved" ? !!client : clientEmailSchema.safeParse(email).success);
  const [chosenServiceKey, setChosenServiceKey] = useState(draft?.serviceKey ?? serviceKey);
  const serviceChanged = !!selected && chosenServiceKey !== serviceKey;
  const busy = isSubmitting || checking || retrying;
  useDraftWarning(form.formState.isDirty || !!pending || busy || legacyUncertain);
  const lock = useRef(false), serverError = useRef<HTMLDivElement>(null), suggested = useRef(false);
  const focus = useRef<keyof FormInput | null>(null);
  const { setValue, setFocus } = form;
  useEffect(() => {
    if (!suggested.current && initialStart !== undefined && ready && !selected && !pending && slots.some(slot => slot.start === initialStart)) {
      suggested.current = true; setValue("start", String(initialStart)); setChosenServiceKey(serviceKey);
    }
  }, [initialStart, ready, selected, pending, slots, setValue, serviceKey]);
  useEffect(() => { onDraftChange?.({ start: selected ?? "", clientName: clientName ?? "", email: email ?? "",
    uncertain: legacyUncertain, clientMode, client, serviceKey: chosenServiceKey, ...(pending ? { pending } : {}) });
  }, [selected, clientName, email, legacyUncertain, clientMode, client, pending, chosenServiceKey, onDraftChange]);
  useEffect(() => {
    if (!busy && focus.current) { setFocus(focus.current); focus.current = null; }
    else if (!busy && errors.root?.server) serverError.current?.focus();
  }, [busy, submitCount, setFocus, errors.root?.server]);
  function clearPending() {
    try { sessionStorage.removeItem(privateCreationKey(storageKey)); } catch { /* Exact replay remains harmless if storage retains the receipt command. */ }
    setPending(null); setCheckedAbsent(false);
  }
  function completed() {
    clearPending(); form.reset({ start: "", clientName: "", email: "" }); setClient(null); setClientMode("free");
  }
  function rejected(cause: unknown) {
    const code = cause instanceof ConvexError ? cause.data?.code : undefined;
    if (code && code !== "UNAUTHENTICATED" && code !== "APPOINTMENT_OPERATION_CONFLICT") clearPending();
    if (code === "INVALID_CLIENT_EMAIL") { form.setError("email", { message: "Escribe un correo válido." }); focus.current = "email"; }
    else if (code === "INVALID_CLIENT_NAME") { form.setError("clientName", { message: "Escribe un nombre válido de entre 1 y 100 caracteres." }); focus.current = "clientName"; }
    else if (code === "SLOT_TAKEN" || code === "SLOT_UNAVAILABLE" || code === "SERVICE_CHANGED" || code === "SERVICE_ARCHIVED") {
      form.setError("start", { message: code.startsWith("SERVICE_") ? "El servicio cambió. Revisa su nombre, duración y los nuevos horarios."
        : "El horario venció o dejó de estar disponible. Elige otra opción." });
      form.setValue("start", ""); focus.current = "start"; onRefresh();
    } else form.setError("root.server", { message: code === "APPOINTMENT_OPERATION_CONFLICT"
      ? "Este identificador pertenece a otro contenido. Conservamos el intento para revisarlo."
      : code === "CLIENT_NOT_FOUND" ? "La ficha ya no está disponible para este negocio. Vuelve a elegir un cliente."
        : code === "UNAUTHENTICATED" ? "Tu sesión dejó de estar disponible. Recupera el acceso y comprueba el intento."
          : "No pudimos confirmar la respuesta. Conservamos el comando exacto; compruébalo antes de continuar." });
  }
  async function send(command: PrivateBookingCommand) {
    onSaving(true);
    try {
      const result = await onCreate(command); completed();
      if (result.outcome === "created") toast.success("Cita confirmada");
      else setRecovery("La confirmación ya estaba registrada. No se creó otra cita.");
      onRefresh();
    } catch (cause) { rejected(cause); }
    finally { onSaving(false); }
  }
  async function submit(values: FormValues) {
    if (clientMode === "saved" && !client) return;
    const contact = clientMode === "free" ? clientEmailSchema.safeParse(values.email) : null;
    if (contact && !contact.success) { form.setError("email", { message: contact.error.issues[0].message }); focus.current = "email"; return; }
    const start = Number(values.start);
    if (!creationContext || !ready || serviceChanged || !slots.some(slot => slot.start === start) || !isFuture(start)) {
      form.setError("start", { message: "El horario venció o dejó de estar disponible. Elige otra opción." }); focus.current = "start"; onRefresh(); return;
    }
    const command: PrivateBookingCommand = { ...creationContext, start, clientName: values.clientName, operationId: crypto.randomUUID(),
      ...(clientMode === "saved" && client ? { clientId: client._id } : { email: contact!.data! }) };
    try { sessionStorage.setItem(privateCreationKey(storageKey), JSON.stringify(command)); }
    catch { form.setError("root.server", { message: "No podemos guardar el intento para recuperarlo tras recargar. Habilita el almacenamiento de esta pestaña antes de confirmar." }); return; }
    setPending(command); setRecovery(""); await send(command);
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || pending || legacyUncertain) return;
    lock.current = true;
    try { await form.handleSubmit(submit, invalid => { focus.current = invalid.clientName ? "clientName" : invalid.email ? "email" : "start"; })(event); }
    finally { lock.current = false; }
  }
  async function checkAttempt() {
    if (!onCheck || !pending || lock.current) return;
    lock.current = true; setChecking(true); onSaving(true); setCheckedAbsent(false);
    try {
      const outcome = await onCheck(pending); form.clearErrors();
      if (outcome === "found") { completed(); onRecovered?.(); setRecovery("Confirmación recuperada. No se creó otra cita."); }
      else { setCheckedAbsent(true); setRecovery("El comando todavía no tiene una confirmación. Puedes reenviar el mismo intento."); }
      onRefresh();
    } catch { setRecovery("No pudimos comprobar este comando. Lo conservamos; vuelve a comprobarlo antes de continuar."); }
    finally { lock.current = false; setChecking(false); onSaving(false); }
  }
  async function retry() {
    if (!pending || !checkedAbsent || lock.current) return;
    lock.current = true; setRetrying(true); setCheckedAbsent(false);
    try { await send(pending); } finally { setRetrying(false); lock.current = false; }
  }
  return <form noValidate aria-label="Confirmar cita" aria-busy={busy} onSubmit={handleSubmit} className={compact ? "space-y-4" : "mt-5"}>
    <fieldset disabled={busy || !!pending || legacyUncertain}>
      <legend className="sr-only">Datos de la cita</legend>
      <FieldGroup className={compact ? "gap-4" : "gap-5"}>
        <Field className="gap-2"><FieldLabel htmlFor="appointment-client">Cliente</FieldLabel>
          <NativeSelect id="appointment-client" value={clientMode} className="w-full" onChange={event => {
            setClientMode(event.target.value as "free" | "saved"); setClient(null); form.setValue("clientName", "", { shouldDirty: true });
            form.setValue("email", "", { shouldDirty: true }); form.clearErrors(["clientName", "email"]);
          }}><option value="free">Nombre y correo</option><option value="saved">Cliente guardado</option></NativeSelect>
        </Field>
        {clientMode === "saved" ? pending ? <p className="wrap-anywhere text-sm font-semibold">{pending.clientName}</p>
          : <ClientPicker selected={client} timeZone={timeZone} onSelect={chosen => { setClient(chosen); form.setValue("clientName", chosen?.name ?? "", { shouldDirty: true }); }} />
          : <>
            <Controller name="clientName" control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel htmlFor="appointment-client-name" className="font-semibold">Nombre del cliente</FieldLabel>
              <Input {...field} id="appointment-client-name" required maxLength={100} autoComplete="off" aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "appointment-client-error" : undefined} />
              {fieldState.invalid && <FieldError id="appointment-client-error" errors={[fieldState.error]} />}
            </Field>} />
            <Controller name="email" control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel htmlFor="appointment-client-email">Correo electrónico</FieldLabel>
              <Input {...field} id="appointment-client-email" type="email" inputMode="email" required maxLength={254} autoComplete="off"
                onChange={event => { field.onChange(event); form.clearErrors("email"); }} onBlur={() => { field.onBlur();
                  if (field.value && !clientEmailSchema.safeParse(field.value).success) form.setError("email", { message: "Escribe un correo válido." }); }}
                aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "appointment-email-error" : undefined} />
              {fieldState.invalid && <FieldError id="appointment-email-error" errors={[fieldState.error]} />}
            </Field>} />
          </>}
        {selectionFields}
        <Controller name="start" control={form.control} render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid} className="gap-2 [&>[data-slot=native-select-wrapper]]:w-full">
          <FieldLabel htmlFor="appointment-start" className="font-semibold">Horario disponible</FieldLabel>
          <NativeSelect {...field} onChange={event => { field.onChange(event); setChosenServiceKey(serviceKey); }} value={serviceChanged ? "" : field.value}
            id="appointment-start" required className="w-full" aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "appointment-start-error" : undefined}>
            <option value="">Elige un horario</option>
            {selected && !slots.some(slot => String(slot.start) === selected) && <option value={selected} disabled>Horario no disponible</option>}
            {slots.map(slot => <option key={slot.start} value={slot.start}>{slot.startTime} – {slot.endTime}</option>)}
          </NativeSelect>
          {fieldState.invalid && <FieldError id="appointment-start-error" errors={[fieldState.error]} />}
          {serviceChanged && <p role="status" className="text-sm">El servicio cambió. Revisa su nombre y duración y vuelve a elegir un horario.</p>}
        </Field>} />
        {errors.root?.server && <div ref={serverError} tabIndex={-1}><FieldError errors={[errors.root.server]} /></div>}
        <Button type="submit" disabled={busy || !!pending || legacyUncertain || !ready || serviceChanged || !valid || !slots.some(slot => String(slot.start) === selected)} className="w-full">
          {busy ? "Guardando…" : compact ? "Guardar" : "Confirmar cita"}
        </Button>
        <p role="status" className="sr-only">{busy ? "Confirmando la cita." : ""}</p>
      </FieldGroup>
    </fieldset>
    {pending && <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void checkAttempt()}>{checking ? "Comprobando…" : "Comprobar intento"}</Button>
      {checkedAbsent && <Button type="button" variant="outline" disabled={busy} onClick={() => void retry()}>Reenviar mismo intento</Button>}</div>}
    {legacyUncertain && <p role="alert" className="mt-3 text-sm">Esta confirmación anterior no tiene identificador recuperable. Revisa Agenda antes de descartar el borrador.</p>}
    {legacyUncertain && <Button type="button" variant="outline" className="mt-3" onClick={() => { setLegacyUncertain(false); form.clearErrors(); }}>Ya revisé Agenda</Button>}
    {recovery && <p role="status" className="mt-3 text-sm leading-6">{recovery}</p>}
  </form>;
}
