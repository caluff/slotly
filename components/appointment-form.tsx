import { zodResolver } from "@hookform/resolvers/zod";
import { ConvexError } from "convex/values";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { appointmentSchema, type AppointmentFormValues, type AppointmentValues } from "@/lib/appointment-schema";
import { useDraftWarning } from "@/components/use-draft-warning";

type Props = {
  initialStart?: number;
  draft?: AppointmentDraft;
  onDraftChange?: (draft: AppointmentDraft) => void;
  onCheck?: (values: { start: number; clientName: string }) => Promise<"found" | "absent">;
  onRecovered?: () => void;
  selectionFields?: ReactNode;
  compact?: boolean;
  slots: { start: number; startTime: string; endTime: string }[];
  ready: boolean;
  isFuture: (start: number) => boolean;
  onCreate: (values: { start: number; clientName: string }) => Promise<unknown>;
  onRefresh: () => void;
  onSaving: (saving: boolean) => void;
};
export type AppointmentDraft = { start: string; clientName: string; uncertain?: boolean };

export function AppointmentForm({ slots, ready, isFuture, onCreate, onRefresh, onSaving, initialStart, draft, onDraftChange, onCheck, onRecovered, selectionFields, compact = false }: Props) {
  const form = useForm<AppointmentFormValues, unknown, AppointmentValues>({
    resolver: zodResolver(appointmentSchema), defaultValues: { start: draft?.start ?? "", clientName: draft?.clientName ?? "" }, shouldFocusError: false,
  });
  const { isSubmitting, submitCount, errors } = form.formState;
  useDraftWarning(form.formState.isDirty || isSubmitting);
  const selected = useWatch({ control: form.control, name: "start" });
  const clientName = useWatch({ control: form.control, name: "clientName" });
  const valid = appointmentSchema.safeParse({ start: selected, clientName }).success;
  const lock = useRef(false);
  const [uncertain, setUncertain] = useState(draft?.uncertain ?? false);
  const [checking, setChecking] = useState(false);
  const [recovery, setRecovery] = useState("");
  const serverError = useRef<HTMLDivElement>(null);
  const suggested = useRef(false);
  const { setValue } = form;
  useEffect(() => {
    if (!suggested.current && initialStart !== undefined && ready && !selected && slots.some(slot => slot.start === initialStart)) {
      suggested.current = true; setValue("start", String(initialStart));
    }
  }, [initialStart, ready, selected, slots, setValue]);
  useEffect(() => { onDraftChange?.({ start: selected ?? "", clientName: clientName ?? "", uncertain }); }, [selected, clientName, uncertain, onDraftChange]);
  const focus = useRef<keyof AppointmentFormValues | null>(null);
  const { setFocus } = form;
  useEffect(() => {
    if (!isSubmitting && focus.current) { setFocus(focus.current); focus.current = null; }
    else if (!isSubmitting && errors.root?.server) serverError.current?.focus();
  }, [isSubmitting, submitCount, setFocus, errors.root?.server]);

  async function submit(values: AppointmentValues) {
    const start = Number(values.start);
    if (!ready || !slots.some((slot) => slot.start === start) || !isFuture(start)) {
      form.setError("start", { message: "El horario venció o dejó de estar disponible. Elige otra opción." });
      focus.current = "start";
      onRefresh();
      return;
    }
    onSaving(true);
    try {
      await onCreate({ start, clientName: values.clientName });
      form.reset({ start: "", clientName: "" });
      focus.current = "start";
      toast.success("Cita confirmada");
      onRefresh();
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (code === "SLOT_TAKEN" || code === "SLOT_UNAVAILABLE") {
        form.setError("start", { message: code === "SLOT_TAKEN"
          ? "Otra cita ocupó ese horario. Actualizamos las opciones; elige otra."
          : "El horario venció o cambió la disponibilidad. Elige otra opción." });
        focus.current = "start";
        onRefresh();
      } else if (code === "INVALID_CLIENT_NAME") {
        form.setError("clientName", { message: "Escribe un nombre válido de entre 1 y 100 caracteres." });
        focus.current = "clientName";
      } else {
        if (!(cause instanceof ConvexError)) setUncertain(true);
        form.setError("root.server", { message: code === "UNAUTHENTICATED"
          ? "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión."
          : code === "SERVICE_NOT_FOUND" ? "El servicio ya no está disponible. Vuelve a elegirlo."
            : code === "BUSINESS_NOT_FOUND" ? "Tu cuenta no tiene un negocio asociado. Recarga la página."
              : "No pudimos confirmar la cita. Comprueba la conexión y el listado antes de reintentar; conservamos los datos." });
      }
    } finally { onSaving(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || uncertain || checking) return;
    lock.current = true;
    try {
      await form.handleSubmit(submit, (invalid) => { focus.current = invalid.start ? "start" : "clientName"; })(event);
    } finally { lock.current = false; }
  }
  async function checkAttempt() {
    if (!onCheck || lock.current) return;
    lock.current = true; setChecking(true); onSaving(true);
    try {
      const outcome = await onCheck({ start: Number(selected), clientName: clientName ?? "" });
      setUncertain(false); form.clearErrors();
      if (outcome === "found") { form.reset({ start: "", clientName: "" }); onRecovered?.(); setRecovery("La cita ya aparece en la agenda. No se volvió a enviar."); }
      else setRecovery("No aparece una cita con este intento. Revisa la disponibilidad antes de volver a guardar.");
      onRefresh();
    } catch { setRecovery("No pudimos comprobar la agenda. Conservamos el intento; vuelve a comprobarlo antes de guardar."); }
    finally { lock.current = false; setChecking(false); onSaving(false); }
  }

  return (
    <form noValidate aria-label="Confirmar cita" aria-busy={isSubmitting || checking} onSubmit={handleSubmit} className={compact ? "space-y-4" : "mt-5"}>
      <fieldset disabled={isSubmitting || uncertain || checking}>
        <legend className="sr-only">Datos de la cita</legend>
        <FieldGroup className={compact ? "gap-4" : "gap-5"}>
          <Controller name="clientName" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel htmlFor="appointment-client" className="font-semibold">Nombre del cliente</FieldLabel>
              <Input {...field} id="appointment-client" required maxLength={100} autoComplete="off" aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "appointment-client-error" : undefined} />
              {fieldState.invalid && <FieldError id="appointment-client-error" errors={[fieldState.error]} />}
            </Field>
          )} />
          {selectionFields}
          <Controller name="start" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2 [&>[data-slot=native-select-wrapper]]:w-full">
              <FieldLabel htmlFor="appointment-start" className="font-semibold">Horario disponible</FieldLabel>
              <NativeSelect {...field} id="appointment-start" required className="w-full" aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "appointment-start-error" : undefined}>
                <option value="">Elige un horario</option>
                {selected && !slots.some((slot) => String(slot.start) === selected) && <option value={selected} disabled>Horario no disponible</option>}
                {slots.map((slot) => <option key={slot.start} value={slot.start}>{slot.startTime} – {slot.endTime}</option>)}
              </NativeSelect>
              {fieldState.invalid && <FieldError id="appointment-start-error" errors={[fieldState.error]} />}
            </Field>
          )} />
          {errors.root?.server && <div ref={serverError} tabIndex={-1}><FieldError errors={[errors.root.server]} /></div>}
          <Button type="submit" disabled={isSubmitting || uncertain || !ready || !valid || !slots.some((slot) => String(slot.start) === selected)} className="w-full">
            {isSubmitting ? "Guardando…" : compact ? "Guardar" : "Confirmar cita"}
          </Button>
          <p role="status" className="sr-only">{isSubmitting ? "Confirmando la cita." : ""}</p>
        </FieldGroup>
      </fieldset>
      {uncertain && onCheck && <Button className="mt-3" type="button" variant="outline" disabled={checking} onClick={() => void checkAttempt()}>{checking ? "Comprobando…" : "Comprobar en agenda"}</Button>}
      {recovery && <p role="status" className="mt-3 text-sm leading-6">{recovery}</p>}
    </form>
  );
}
