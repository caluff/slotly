"use client";

import { CalendarClock, CalendarDays, CalendarX2, CheckCheck, EllipsisVertical, UserX } from "@/components/ui/icons";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@ui-sdk/react/menu";
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
  function whenClosed(open: boolean) {
    if (open || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    onAction(action, trigger.current);
  }
  return <Menu open={open} onOpenChange={setOpen} onOpenChangeComplete={whenClosed}>
    <MenuTrigger render={<Button size="icon" variant="ghost" />} ref={trigger} aria-label={label}>
      <EllipsisVertical aria-hidden="true" />
    </MenuTrigger>
    <MenuContent align="end" sideOffset={6} collisionPadding={12}
      className="z-40 max-h-[var(--available-height)] w-48 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-md border border-line bg-card p-1 text-foreground outline-none"
      finalFocus={() => pendingAction.current ? null : trigger.current}>
      <MenuItem className={itemClass} render={<a href={dayHref} onClick={event => { setOpen(false); navigateWorkspace(event); }} />} aria-label={`Localizar fecha ${date}`}>
        <CalendarDays aria-hidden="true" />Localizar fecha
      </MenuItem>
      {canReschedule && <MenuItem className={itemClass} onSelect={() => { pendingAction.current = "reschedule"; }}>
        <CalendarClock aria-hidden="true" />Reprogramar
      </MenuItem>}
      {canMarkResult && <>
        <MenuItem disabled={resultBlocked} className={`${itemClass} appointment-status-completed data-[disabled]:opacity-60`} onSelect={() => { pendingAction.current = "completed"; }}><CheckCheck aria-hidden="true" />Completada</MenuItem>
        <MenuItem disabled={resultBlocked} className={`${itemClass} appointment-status-no_show data-[disabled]:opacity-60`} onSelect={() => { pendingAction.current = "no_show"; }}><UserX aria-hidden="true" />No asistió</MenuItem>
      </>}
      {canCancel && <><MenuSeparator className="my-1 h-px bg-line" />
        <MenuItem className={`${itemClass} text-destructive data-[highlighted]:bg-destructive/5`} onSelect={() => { pendingAction.current = "cancel"; }}>
          <CalendarX2 aria-hidden="true" />Cancelar cita
        </MenuItem>
      </>}
    </MenuContent>
  </Menu>;
}
