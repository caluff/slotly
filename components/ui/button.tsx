import { Button as SdkButton } from "@ui-sdk/react/button";
import { cn } from "cn";
import type { ComponentProps, MouseEvent } from "react";

const variants = {
  default: "border-0 bg-accent text-primary-foreground hover:bg-accent-hover",
  destructive: "border-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20",
  outline: "border border-accent/25 bg-transparent text-foreground hover:bg-accent/5",
  secondary: "border-0 bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "border-0 bg-transparent text-foreground hover:bg-surface",
  link: "border-0 bg-transparent text-primary underline-offset-4 hover:bg-transparent hover:underline",
};

const sizes = {
  default: "h-9 w-auto px-4 py-1.5 has-[>svg,>.slotly-icon]:px-3",
  xs: "h-6 w-auto gap-1 px-2 text-xs has-[>svg,>.slotly-icon]:px-1.5 [&_svg:not([class*='size-'])]:size-3 [&>.slotly-icon]:size-3",
  sm: "h-8 w-auto gap-1.5 px-3 has-[>svg,>.slotly-icon]:px-2.5",
  lg: "h-10 w-auto px-6 has-[>svg,>.slotly-icon]:px-4",
  icon: "size-9 p-0",
  "icon-xs": "size-6 p-0 [&_svg:not([class*='size-'])]:size-3 [&>.slotly-icon]:size-3",
  "icon-sm": "size-8 p-0",
  "icon-lg": "size-10 p-0",
};

type ButtonProps = ComponentProps<"button"> &
  Pick<ComponentProps<typeof SdkButton>, "render"> & {
    variant?: keyof typeof variants;
    size?: keyof typeof sizes;
  };

export function Button({
  className,
  variant = "default",
  size = "default",
  type,
  render,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <SdkButton
      type={type ?? (render ? undefined : "submit")}
      render={render}
      onClick={onClick && ((event) => {
        if (event.currentTarget instanceof HTMLButtonElement) {
          return onClick(event as MouseEvent<HTMLButtonElement>);
        }
      })}
      data-variant={variant}
      data-size={size}
      pendingAnnouncement="Cargando…"
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm leading-5 font-semibold whitespace-nowrap no-underline transition-none disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
