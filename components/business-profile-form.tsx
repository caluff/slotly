import { zodResolver } from "@hookform/resolvers/zod";
import { ConvexError } from "convex/values";
import { useEffect, useMemo, useRef, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { createBusinessProfileSchema, type BusinessProfileValues } from "@/lib/business-profile-schema";
import { useDraftWarning } from "@/components/use-draft-warning";

type BusinessProfileFormProps = {
  timeZones: string[];
  onCreate: (values: BusinessProfileValues) => Promise<unknown>;
};

// Used inside the authenticated client tree; the callback also enables isolated
// form verification without writing business data to Convex.
export function BusinessProfileForm({ timeZones, onCreate }: BusinessProfileFormProps) {
  const schema = useMemo(() => createBusinessProfileSchema(timeZones), [timeZones]);
  const form = useForm<BusinessProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", timeZone: "America/Montevideo" },
    // Focus after the disabled fieldset is enabled again, including async errors.
    shouldFocusError: false,
  });
  const { errors, isSubmitting, isSubmitSuccessful, submitCount } = form.formState;
  const isSaving = isSubmitting || isSubmitSuccessful;
  useDraftWarning(form.formState.isDirty || isSubmitting);
  const { setFocus } = form;
  const submissionLock = useRef(false);
  const focusAfterSubmit = useRef<keyof BusinessProfileValues | null>(null);

  useEffect(() => {
    if (!isSubmitting && focusAfterSubmit.current) {
      setFocus(focusAfterSubmit.current);
      focusAfterSubmit.current = null;
    }
  }, [isSubmitting, submitCount, setFocus]);

  async function onSubmit(values: BusinessProfileValues) {
    try {
      await onCreate(values);
      // The reactive business query replaces this form after a successful save.
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (code === "INVALID_NAME" || code === "INVALID_TIME_ZONE") {
        const field = code === "INVALID_NAME" ? "name" : "timeZone";
        form.setError(field, {
          type: "server",
          message: field === "name"
            ? "Escribe un nombre de entre 1 y 100 caracteres."
            : "Selecciona una zona horaria válida de la lista.",
        });
        focusAfterSubmit.current = field;
        return;
      }
      form.setError("root.server", {
        type: "server",
        message: code === "UNAUTHENTICATED"
          ? "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión e inténtalo de nuevo."
          : code === "BUSINESS_ALREADY_EXISTS"
            ? "Tu cuenta ya tiene un negocio. Recarga la página para ver el perfil guardado."
            : "No pudimos guardar el perfil. Comprueba tu conexión e inténtalo de nuevo; los datos siguen en el formulario.",
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Covers rapid Enter/click events before React commits the disabled state.
    if (submissionLock.current || isSubmitSuccessful) return;
    submissionLock.current = true;
    try {
      await form.handleSubmit(onSubmit, (fieldErrors) => {
        focusAfterSubmit.current = fieldErrors.name ? "name" : fieldErrors.timeZone ? "timeZone" : null;
      })(event);
    } finally {
      submissionLock.current = false;
    }
  }

  return (
    <>
      <h1 id="business-heading" tabIndex={-1} className="workspace-title">Crea el perfil de tu negocio</h1>
      <form onSubmit={handleSubmit} noValidate className="mt-6 max-w-xl" aria-busy={isSaving}>
        <fieldset disabled={isSaving}>
          <legend className="sr-only">Datos del negocio</legend>
          <FieldGroup className="gap-5">
            <Controller name="name" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} data-disabled={isSaving} className="gap-2">
                <FieldLabel htmlFor="business-name" className="font-semibold">Nombre del negocio o profesional</FieldLabel>
                <Input {...field} id="business-name" autoComplete="organization" required maxLength={100}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "business-name-error" : undefined} />
                {fieldState.invalid && <FieldError id="business-name-error" errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller name="timeZone" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} data-disabled={isSaving} className="gap-2">
                <FieldLabel htmlFor="business-time-zone" className="font-semibold">Zona horaria</FieldLabel>
                <NativeSelect {...field} id="business-time-zone" required
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "business-time-zone-error" : undefined}>
                  {timeZones.map((zone) => <NativeSelectOption key={zone} value={zone}>{zone}</NativeSelectOption>)}
                </NativeSelect>
                {fieldState.invalid && <FieldError id="business-time-zone-error" errors={[fieldState.error]} />}
              </Field>
            )} />
            {errors.root?.server && <FieldError errors={[errors.root.server]} />}
            <Button type="submit" disabled={isSaving} className="w-full disabled:cursor-wait sm:w-auto sm:self-start">
              {isSaving ? "Guardando perfil…" : "Guardar perfil"}
            </Button>
            <p role="status" className="sr-only">{isSaving ? "Guardando el perfil de tu negocio." : ""}</p>
          </FieldGroup>
        </fieldset>
      </form>
    </>
  );
}
