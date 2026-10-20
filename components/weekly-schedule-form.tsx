import { zodResolver } from "@hookform/resolvers/zod";
import { ConvexError } from "convex/values";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  scheduleFormValues, weekDays, weeklyScheduleSchema,
  type WeeklyScheduleFormValues, type WeeklyScheduleValues,
} from "@/lib/weekly-schedule-schema";

type WeeklyScheduleFormProps = {
  schedule: WeeklyScheduleValues | null;
  onSave: (values: WeeklyScheduleValues) => Promise<unknown>;
};
type FormField = FieldPath<WeeklyScheduleFormValues>;

export function WeeklyScheduleForm({ schedule, onSave }: WeeklyScheduleFormProps) {
  const form = useForm<WeeklyScheduleFormValues, unknown, WeeklyScheduleValues>({
    resolver: zodResolver(weeklyScheduleSchema),
    defaultValues: scheduleFormValues(schedule),
    shouldFocusError: false,
  });
  const { errors, isDirty, isSubmitting, submitCount } = form.formState;
  const { reset, setFocus } = form;
  const days = useWatch({ control: form.control, name: "days" });
  const [savedOnce, setSavedOnce] = useState(false);
  const submissionLock = useRef(false);
  const focusAfterSubmit = useRef<FormField | null>(null);
  const snapshot = JSON.stringify(schedule?.days ?? null);
  const seenSnapshot = useRef(snapshot);

  useEffect(() => {
    if (snapshot === seenSnapshot.current) return;
    seenSnapshot.current = snapshot;
    // Treat the week as one draft. Never merge reactive changes into a local
    // edit or replay a skipped snapshot after saving the user's full week.
    if (!isDirty && !isSubmitting) reset(scheduleFormValues(schedule));
  }, [snapshot, schedule, isDirty, isSubmitting, reset]);

  useEffect(() => {
    if (!isSubmitting && focusAfterSubmit.current) {
      setFocus(focusAfterSubmit.current);
      focusAfterSubmit.current = null;
    }
  }, [isSubmitting, submitCount, setFocus]);

  async function onSubmit(values: WeeklyScheduleValues) {
    try {
      await onSave(values);
      reset(scheduleFormValues(values));
      setSavedOnce(true);
      toast.success("Horario guardado");
    } catch (cause) {
      const data = cause instanceof ConvexError ? cause.data : undefined;
      const index = Number.isInteger(data?.dayOfWeek) ? Number(data.dayOfWeek) - 1 : -1;
      if ((data?.code === "INVALID_TIME" || data?.code === "INVALID_INTERVAL") &&
        index >= 0 && index < 7 && (data.field === "start" || data.field === "end")) {
        const field = `days.${index}.${data.field}` as FormField;
        form.setError(field, {
          type: "server",
          message: data.code === "INVALID_INTERVAL"
            ? "El cierre debe ser posterior a la apertura, dentro del mismo día."
            : "Escribe una hora válida (HH:mm).",
        });
        focusAfterSubmit.current = field;
        return;
      }
      form.setError("root.server", {
        type: "server",
        message: data?.code === "UNAUTHENTICATED"
          ? "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión e inténtalo de nuevo."
          : data?.code === "BUSINESS_NOT_FOUND"
            ? "Tu cuenta no tiene un negocio asociado. Recarga la página y crea su perfil."
            : data?.code === "INVALID_WEEK"
              ? "La semana debe incluir sus siete días una sola vez. Recarga la página e inténtalo de nuevo."
              : "No pudimos guardar el horario. Comprueba tu conexión e inténtalo de nuevo; los datos siguen en el formulario.",
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current) return;
    submissionLock.current = true;
    try {
      await form.handleSubmit(onSubmit, (fieldErrors) => {
        for (let index = 0; index < 7; index++) {
          const day = fieldErrors.days?.[index];
          if (day?.start || day?.end) {
            focusAfterSubmit.current = `days.${index}.${day.start ? "start" : "end"}`;
            break;
          }
        }
      })(event);
    } finally {
      submissionLock.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Horario semanal" aria-busy={isSubmitting}>
      {schedule === null && !savedOnce && <p className="mb-5 text-sm text-muted">Todavía no has guardado un horario.</p>}
      <fieldset disabled={isSubmitting}>
        <legend className="sr-only">Semana de atención</legend>
        <FieldGroup className="gap-0 divide-y divide-line border-y border-line">
          {weekDays.map((label, index) => (
            <fieldset key={label} className="grid min-w-0 grid-cols-2 gap-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
              <legend className="sr-only">{label}</legend>
              <Controller name={`days.${index}.isOpen`} control={form.control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="col-span-2 gap-2 sm:col-span-1">
                  <FieldLabel htmlFor={`schedule-${index}-state`} className="font-semibold">{label}</FieldLabel>
                  <NativeSelect ref={field.ref} id={`schedule-${index}-state`} name={field.name}
                    value={field.value ? "open" : "closed"} onBlur={field.onBlur}
                    onChange={(event) => {
                      field.onChange(event.target.value === "open");
                      form.clearErrors([`days.${index}.start`, `days.${index}.end`]);
                    }} className="w-full sm:w-32" aria-invalid={fieldState.invalid}>
                    <NativeSelectOption value="closed">Cerrado</NativeSelectOption>
                    <NativeSelectOption value="open">Abierto</NativeSelectOption>
                  </NativeSelect>
                </Field>
              )} />
              {(["start", "end"] as const).map((timeField) => (
                <Controller key={timeField} name={`days.${index}.${timeField}`} control={form.control} render={({ field, fieldState }) => {
                  const enabled = days[index].isOpen;
                  const id = `schedule-${index}-${timeField}`;
                  return (
                    <Field data-invalid={enabled && fieldState.invalid} data-disabled={!enabled || isSubmitting} className="min-w-0 gap-2">
                      <FieldLabel htmlFor={id} className="font-semibold">
                        {timeField === "start" ? "Apertura" : "Cierre"}<span className="sr-only"> del {label.toLowerCase()}</span>
                      </FieldLabel>
                      <Input {...field} id={id} type="time" step={60} min="00:00" max="23:59"
                        required={enabled} disabled={!enabled || isSubmitting} autoComplete="off"
                        className="w-full tabular-nums" aria-invalid={enabled && fieldState.invalid}
                        aria-describedby={enabled && fieldState.invalid ? `${id}-error` : undefined} />
                      {enabled && fieldState.invalid && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
                    </Field>
                  );
                }} />
              ))}
            </fieldset>
          ))}
        </FieldGroup>
        {errors.days?.root && <FieldError className="mt-4" errors={[errors.days.root]} />}
        {errors.root?.server && <FieldError className="mt-4" errors={[errors.root.server]} />}
        <Button type="submit" disabled={isSubmitting} className="mt-6 w-full disabled:cursor-wait sm:w-auto">
          {isSubmitting ? "Guardando horario…" : "Guardar horario"}
        </Button>
        <p role="status" className="sr-only">{isSubmitting ? "Guardando el horario." : ""}</p>
      </fieldset>
    </form>
  );
}
