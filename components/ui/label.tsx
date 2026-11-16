import { Label as SdkLabel } from "@ui-sdk/react/label";
import { cn } from "cn";
import type { ComponentProps } from "react";

export function Label({
  className,
  ...props
}: ComponentProps<"label">) {
  return (
    <SdkLabel
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
