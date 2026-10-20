import { zodResolver } from "@hookform/resolvers/zod";
import { ConvexError } from "convex/values";
import { useEffect, useRef, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { serviceSchema, type ServiceFormValues, type ServiceValues } from "@/lib/service-schema";

type ServiceFormProps = { onCreate: (values: ServiceValues) => Promise<unknown> };
const emptyValues: ServiceFormValues = { name: "", durationMinutes: "" };

// The parent connects the mutation; a local callback can verify every form state
// without writing synthetic services into a real account.
export function ServiceForm({ onCreate }: ServiceFormProps) {
  const form = useForm<ServiceFormValues, unknown, ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: emptyValues,
    shouldFocusError: false,
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const { setFocus } = form;
  const submissionLock = useRef(false);
  const focusAfterSubmit = useRef<keyof ServiceFormValues | null>(null);

  useEffect(() => {
    if (!isSubmitting && focusAfterSubmit.current) {
      setFocus(focusAfterSubmit.current);
      focusAfterSubmit.current = null;
    }
  }, [isSubmitting, submitCount, setFocus]);

  async function onSubmit(values: ServiceValues) {
    try {
      await onCreate(values);
      form.reset(emptyValues);
      focusAfterSubmit.current = "name";
      toast.success("Servicio creado");
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (code === "INVALID_NAME" || code === "INVALID_DURATION") {
        const field = code === "INVALID_NAME" ? "name" : "durationMinutes";
        form.setError(field, {
          type: "server",
          message: field === "name"
            ? "Escribe un nombre de entre 1 y 100 caracteres."
            : "Escribe una duración en minutos enteros positivos, hasta 9007199254740991.",
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
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current) return;
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
      <fieldset disabled={isSubmitting}>
        <legend className="sr-only">Datos del servicio</legend>
        <FieldGroup className="gap-5">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
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
                <Input {...field} id="service-duration" type="number" inputMode="numeric" min={1} step={1}
                  max={Number.MAX_SAFE_INTEGER} required autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "service-duration-error" : undefined} />
                {fieldState.invalid && <FieldError id="service-duration-error" errors={[fieldState.error]} />}
              </Field>
            )} />
          </div>
          {errors.root?.server && <FieldError errors={[errors.root.server]} />}
          <Button type="submit" disabled={isSubmitting} className="w-full disabled:cursor-wait sm:w-auto sm:self-start">
            {isSubmitting ? "Guardando servicio…" : "Crear servicio"}
          </Button>
          <p role="status" className="sr-only">{isSubmitting ? "Guardando el servicio." : ""}</p>
        </FieldGroup>
      </fieldset>
    </form>
  );
}
