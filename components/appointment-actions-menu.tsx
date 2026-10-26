"use client";

import { CalendarClock, CalendarDays, CalendarX2, CheckCheck, EllipsisVertical, UserX } from "@/components/ui/icons";
import { DropdownMenu } from "radix-ui";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { navigateWorkspace } from "@/components/dashboard-workspace";

type AppointmentAction = "cancel" | "reschedule" | "completed" | "no_show";
const itemClass = "flex cursor-default select-none items-center gap-2 rounded-sm px-3 py-2 text-sm leading-5 outline-none data-[highlighted]:bg-surface [&_svg]:size-4 [&_svg]:shrink-0";

export function AppointmentActionsMenu({ label, date, dayHref, canReschedule, canCancel, canMarkResult = false, resultBlocked = false, onAction }: {
  label: string; date: string; dayHref: string; canReschedule: boolean; canCancel: boolean;
  canMarkResult?: boolean; resultBlocked?: boolean;
  onAction: (action: AppointmentAction, trigger: HTMLButtonElement | null) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<AppointmentAction | null>(null);
  const [open, setOpen] = useState(false);
  return <DropdownMenu.Root open={open} onOpenChange={setOpen}>
    <DropdownMenu.Trigger asChild>
      <Button ref={trigger} type="button" variant="ghost" size="icon" aria-label={label}>
        <EllipsisVertical aria-hidden="true" />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={12}
        className="z-40 max-h-[var(--radix-dropdown-menu-content-available-height)] w-48 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-md border border-line bg-white p-1 text-foreground outline-none"
        onCloseAutoFocus={(event) => {
          const action = pendingAction.current;
          if (!action) return;
          // Let Radix close/unmount its focus scope before opening the dialog.
          // Its default focus restoration must not steal the dialog's focus.
          event.preventDefault();
          pendingAction.current = null;
          onAction(action, trigger.current);
        }}>
        <DropdownMenu.Item asChild className={itemClass}>
          <a href={dayHref} onClick={(event) => { setOpen(false); navigateWorkspace(event); }} aria-label={`Localizar fecha ${date}`}><CalendarDays aria-hidden="true" />Localizar fecha</a>
        </DropdownMenu.Item>
        {canReschedule && <DropdownMenu.Item className={itemClass} onSelect={() => { pendingAction.current = "reschedule"; }}>
          <CalendarClock aria-hidden="true" />Reprogramar
        </DropdownMenu.Item>}
        {canMarkResult && <>
          <DropdownMenu.Item disabled={resultBlocked} className={`${itemClass} appointment-status-completed data-[disabled]:opacity-60`} onSelect={() => { pendingAction.current = "completed"; }}><CheckCheck aria-hidden="true" />Completada</DropdownMenu.Item>
          <DropdownMenu.Item disabled={resultBlocked} className={`${itemClass} appointment-status-no_show data-[disabled]:opacity-60`} onSelect={() => { pendingAction.current = "no_show"; }}><UserX aria-hidden="true" />No asistió</DropdownMenu.Item>
        </>}
        {canCancel && <><DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={`${itemClass} text-destructive data-[highlighted]:bg-destructive/5`} onSelect={() => { pendingAction.current = "cancel"; }}>
            <CalendarX2 aria-hidden="true" />Cancelar cita
          </DropdownMenu.Item>
        </>}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
}
