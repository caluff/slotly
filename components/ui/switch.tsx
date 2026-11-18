import { Switch as SdkSwitch, SwitchThumb } from "@ui-sdk/react/switch";
import type { ComponentProps } from "react";

export function Switch(props: Omit<ComponentProps<typeof SdkSwitch>, "children" | "className">) {
  return (
    <SdkSwitch
      {...props}
      className="relative h-9 w-11 border-0 bg-transparent px-1 before:absolute before:inset-x-0 before:inset-y-1.5 before:rounded-full before:border before:border-muted before:bg-surface data-[checked]:bg-transparent data-[checked]:before:border-accent data-[checked]:before:bg-accent data-[readonly]:cursor-wait"
    >
      <SwitchThumb className="relative size-4" />
    </SdkSwitch>
  );
}
