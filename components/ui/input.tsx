import { Input as SdkInput } from "@ui-sdk/react/input";
import { cn } from "cn";
import type { ComponentProps } from "react";

export function Input({
  className,
  ...props
}: Omit<ComponentProps<typeof SdkInput>, "className"> & { className?: string }) {
  return (
    <SdkInput
      className={cn(
        "form-control h-9 min-w-0 transition-colors motion-reduce:transition-none disabled:cursor-not-allowed",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
