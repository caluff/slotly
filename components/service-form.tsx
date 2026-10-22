import { zodResolver } from "@hookform/resolvers/zod";
import { ConvexError } from "convex/values";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { serviceSchema, type ServiceFormValues, type ServiceValues } from "@/lib/service-schema";
import { useDraftWarning } from "@/components/use-draft-warning";
import { durationError } from "@/lib/service-duration";
import type { ServiceCreation } from "@/components/use-service-undo";

type CreateCommand = ServiceValues & { operationId: string };
type ServiceFormProps = { onCreate: (values: CreateCommand) => Promise<ServiceCreation>; onSaved: (result: ServiceCreation) => void; onDiscard: () => void; onSaving?: (saving: boolean) => void; compact?: boolean; disabled?: boolean };
const emptyValues: ServiceFormValues = { name: "", durationMinutes: "" };

// The parent connects the mutation; a local callback can verify every form state
// without writing synthetic services into a real account.
export function ServiceForm({ onCreate, onSaved, onDiscard, onSaving, compact = false, disabled = false }: ServiceFormProps) {
  const form = useForm<ServiceFormValues, unknown, ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: emptyValues,
    shouldFocusError: false,
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const { setFocus } = form;
  useDraftWarning(form.formState.isDirty || isSubmitting);
  const submissionLock = useRef(false);
  const [pending, setPending] = useState<CreateCommand | null>(null);
  const [recovering, setRecovering] = useState(false);
  const focusAfterSubmit = useRef<keyof ServiceFormValues | null>(null);

  useEffect(() => {
    if (!isSubmitting && focusAfterSubmit.current) {
      setFocus(focusAfterSubmit.current);
      focusAfterSubmit.current = null;
    }
  }, [isSubmitting, submitCount, setFocus]);

  async function onSubmit(values: ServiceValues) {
    if (disabled) return;
    onSaving?.(true);
    const command = pending ?? { ...values, operationId: crypto.randomUUID() };
    try {
      const result = await onCreate(command);
      setPending(null);
      form.reset(emptyValues);
      focusAfterSubmit.current = null;
      onSaved(result);
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (!code) setPending(command);
      else setPending(null);
      if (code === "INVALID_NAME" || code === "INVALID_DURATION") {
        const field = code === "INVALID_NAME" ? "name" : "durationMinutes";
        form.setError(field, {
          type: "server",
          message: field === "name"
            ? "Escribe un nombre de entre 1 y 100 caracteres."
            : durationError,
        });
        focusAfterSubmit.current = field;
        return;
      }
      form.setError("root.server", {
        type: "server",
        message: code === "UNAUTHENTICATED"
          ? "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión e inténtalo de nuevo."
          : code === "BUSINESS_NOT_FOUND"
            ? "Tu cuenta no tiene un negocio asociado. Recarga la página y crea su perfil."
            : "No pudimos guardar el servicio. Comprueba tu conexión e inténtalo de nuevo; los datos siguen en el formulario.",
      });
    } finally { onSaving?.(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current || pending || disabled) return;
    submissionLock.current = true;
    try {
      await form.handleSubmit(onSubmit, (fieldErrors) => {
        focusAfterSubmit.current = fieldErrors.name ? "name" : fieldErrors.durationMinutes ? "durationMinutes" : null;
      })(event);
    } finally {
      submissionLock.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Crear servicio" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting || !!pending || recovering || disabled}>
        <legend className="sr-only">Datos del servicio</legend>
        <FieldGroup className="gap-5">
          <div className={`grid gap-5 ${compact ? "" : "sm:grid-cols-[minmax(0,1fr)_12rem]"}`}>
            <Controller name="name" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting} className="gap-2">
                <FieldLabel htmlFor="service-name" className="font-semibold">Nombre del servicio</FieldLabel>
                <Input {...field} id="service-name" autoComplete="off" required maxLength={100}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "service-name-error" : undefined} />
                {fieldState.invalid && <FieldError id="service-name-error" errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller name="durationMinutes" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting} className="gap-2">
                <FieldLabel htmlFor="service-duration" className="font-semibold">Duración (minutos)</FieldLabel>
                <Input {...field} id="service-duration" type="number" inputMode="numeric" min={15} step={5}
                  max={Number.MAX_SAFE_INTEGER} required autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "service-duration-error" : undefined} />
                {fieldState.invalid && <FieldError id="service-duration-error" errors={[fieldState.error]} />}
              </Field>
            )} />
          </div>
          {errors.root?.server && <FieldError errors={[errors.root.server]} />}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting} className="px-2 disabled:cursor-wait">
              {isSubmitting ? "Guardando…" : "Crear servicio"}
            </Button>
            <Button type="button" variant="ghost" className="px-2" onClick={() => { if (submissionLock.current || pending || recovering || disabled) return; focusAfterSubmit.current = null; form.reset(emptyValues); onDiscard(); }}>Cancelar</Button>
          </div>
          <p role="status" className="sr-only">{isSubmitting ? "Guardando el servicio." : ""}</p>
        </FieldGroup>
      </fieldset>
      {pending && <div className="mt-4 space-y-3"><p role="status" className="text-sm">No recibimos la respuesta. Comprueba el mismo intento antes de crear otro servicio.</p><Button type="button" disabled={recovering || disabled} onClick={async () => { if (submissionLock.current) return; submissionLock.current = true; setRecovering(true); try { await onSubmit(pending); } finally { setRecovering(false); submissionLock.current = false; } }}>Comprobar creación</Button></div>}
    </form>
  );
}
