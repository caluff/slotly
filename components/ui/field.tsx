import { FieldError as SdkFieldError, FieldGroup as SdkFieldGroup } from "@ui-sdk/react/field";
import { cn } from "cn";
import type { ComponentProps } from "react";
import { Label } from "@/components/ui/label";

export function Field({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="field"
      className={cn(
        "group/field flex w-full flex-col gap-3 data-[invalid=true]:text-destructive [&>*]:w-full [&>.sr-only]:w-auto",
        className,
      )}
      {...props}
    />
  );
}

export function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <SdkFieldGroup className={cn("mt-0 flex w-full flex-col gap-7", className)} {...props} />
  );
}

export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return (
    <Label
      data-slot="field-label"
      className={cn("w-fit leading-snug group-data-[disabled=true]/field:opacity-50", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  children,
  errors,
  ...props
}: ComponentProps<"div"> & { errors?: Array<{ message?: string } | undefined> }) {
  const messages = [...new Set(errors?.flatMap((error) => error?.message ? [error.message] : []))];
  const content = children || (messages.length > 1 ? (
    <ul className="ml-4 flex list-disc flex-col gap-1">
      {messages.map((message) => <li key={message}>{message}</li>)}
    </ul>
  ) : messages[0]);

  if (!content) return null;

  return (
    <SdkFieldError
      match
      role="alert"
      className={cn("text-sm font-normal text-destructive", className)}
      {...props}
    >
      {content}
    </SdkFieldError>
  );
}
