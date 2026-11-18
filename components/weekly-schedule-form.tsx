import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from "@ui-sdk/react/accordion";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConvexError } from "convex/values";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { useDraftWarning } from "@/components/use-draft-warning";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Check } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
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
  useDraftWarning(isDirty || isSubmitting);
  const { reset, setFocus } = form;
  const days = useWatch({ control: form.control, name: "days" });
  const formId = useId();
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
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
  }, [expandedDays, isSubmitting, submitCount, setFocus]);

  function revealInvalidTime(index: number, time: "start" | "end") {
    focusAfterSubmit.current = `days.${index}.${time}`;
    setExpandedDays([weekDays[index]]);
  }

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
        revealInvalidTime(index, data.field);
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
            revealInvalidTime(index, day.start ? "start" : "end");
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
      {schedule === null && !savedOnce && <p className="mb-3 text-sm text-muted">Todavía no has guardado un horario.</p>}
      <fieldset disabled={isSubmitting}>
        <legend className="sr-only">Semana de atención</legend>
        <Accordion aria-label="Días de atención" value={expandedDays} onValueChange={setExpandedDays} disabled={isSubmitting} className="max-w-none border-line">
          {weekDays.map((label, index) => {
            const { isOpen, start, end } = days[index];
            const invalid = Boolean(errors.days?.[index]?.start || errors.days?.[index]?.end);
            const summary = !isOpen ? "Cerrado" : start && end ? `${start}–${end}` : "Sin completar";
            return (
              <AccordionItem key={label} value={label} className="border-line last:border-b-0">
                <AccordionHeader>
                  <AccordionTrigger type="button" className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface focus-visible:-outline-offset-2 data-open:bg-surface">
                    <span className="mr-auto font-semibold">{label}</span>
                    <span className={invalid ? "text-destructive" : "text-muted tabular-nums"}>
                      {invalid ? "Revisar horas" : summary}
                    </span>
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionPanel className="px-2 pt-2 pb-3">
                  <Controller name={`days.${index}.isOpen`} control={form.control} render={({ field }) => (
                    <Checkbox checked={field.value} disabled={isSubmitting} onBlur={field.onBlur}
                      render={<Button type="button" variant="ghost" className="group justify-start px-0 font-medium hover:bg-transparent" />}
                      onCheckedChange={(checked) => {
                        field.onChange(checked === true);
                        form.clearErrors([`days.${index}.start`, `days.${index}.end`]);
                      }}>
                      <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-muted bg-background text-primary-foreground group-data-checked:border-accent group-data-checked:bg-accent">
                        <CheckboxIndicator><Check className="size-3" /></CheckboxIndicator>
                      </span>
                      Abierto<span className="sr-only"> el {label.toLowerCase()}</span>
                    </Checkbox>
                  )} />
                  {isOpen && <div className="mt-1 grid grid-cols-2 gap-3">
                    {(["start", "end"] as const).map((timeField) => (
                      <Controller key={timeField} name={`days.${index}.${timeField}`} control={form.control} render={({ field, fieldState }) => {
                        const id = `${formId}-${index}-${timeField}`;
                        return (
                          <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting} className="min-w-0 gap-1.5">
                            <FieldLabel htmlFor={id} className="text-xs font-semibold">
                              {timeField === "start" ? "Apertura" : "Cierre"}<span className="sr-only"> del {label.toLowerCase()}</span>
                            </FieldLabel>
                            <Input {...field} id={id} type="time" step={60} min="00:00" max="23:59"
                              required disabled={isSubmitting} autoComplete="off" className="w-full tabular-nums"
                              aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? `${id}-error` : undefined} />
                            {fieldState.invalid && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
                          </Field>
                        );
                      }} />
                    ))}
                  </div>}
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
        {errors.days?.root && <FieldError className="mt-4" errors={[errors.days.root]} />}
        {errors.root?.server && <FieldError className="mt-4" errors={[errors.root.server]} />}
        <div className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-line bg-background py-3">
          <p role="status" className="text-xs text-muted">{isSubmitting ? "Guardando…" : isDirty ? "Cambios sin guardar" : savedOnce ? "Horario guardado" : ""}</p>
          <Button type="submit" disabled={isSubmitting || (!isDirty && (schedule !== null || savedOnce))}>
            {isSubmitting ? "Guardando…" : "Guardar semana"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
