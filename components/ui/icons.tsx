"use client";

import { useEffect, useId, useRef, type ComponentProps } from "react";
import type { IconHandle } from "@animateicons/react";
import { ArchiveIcon } from "@animateicons/react/lucide/archive-icon";
import { UsersIcon } from "@animateicons/react/lucide/users-icon";
import { BellIcon } from "@animateicons/react/lucide/bell-icon";
import { CalendarCheckIcon } from "@animateicons/react/lucide/calendar-check-icon";
import { CalendarClockIcon } from "@animateicons/react/lucide/calendar-clock-icon";
import { CalendarDaysIcon } from "@animateicons/react/lucide/calendar-days-icon";
import { CalendarXIcon } from "@animateicons/react/lucide/calendar-x-icon";
import { CheckIcon } from "@animateicons/react/lucide/check-icon";
import { CheckCheckIcon } from "@animateicons/react/lucide/check-check-icon";
import { ChevronDownIcon as AnimatedChevronDown } from "@animateicons/react/lucide/chevron-down-icon";
import { ChevronLeftIcon } from "@animateicons/react/lucide/chevron-left-icon";
import { ChevronRightIcon } from "@animateicons/react/lucide/chevron-right-icon";
import { CircleCheckIcon as AnimatedCircleCheck } from "@animateicons/react/lucide/circle-check-icon";
import { ClockIcon } from "@animateicons/react/lucide/clock-icon";
import { CopyIcon } from "@animateicons/react/lucide/copy-icon";
import { EllipsisVerticalIcon } from "@animateicons/react/lucide/ellipsis-vertical-icon";
import { ExternalLinkIcon } from "@animateicons/react/lucide/external-link-icon";
import { ListChecksIcon } from "@animateicons/react/lucide/list-checks-icon";
import { LockIcon } from "@animateicons/react/lucide/lock-icon";
import { MenuIcon } from "@animateicons/react/lucide/menu-icon";
import { PencilIcon } from "@animateicons/react/lucide/pencil-icon";
import { PlusIcon } from "@animateicons/react/lucide/plus-icon";
import { RotateCcwIcon } from "@animateicons/react/lucide/rotate-ccw-icon";
import { SearchIcon } from "@animateicons/react/lucide/search-icon";
import { SettingsIcon } from "@animateicons/react/lucide/settings-icon";
import { StoreIcon } from "@animateicons/react/lucide/store-icon";
import { Trash2Icon } from "@animateicons/react/lucide/trash-2-icon";
import { UserXIcon } from "@animateicons/react/lucide/user-x-icon";
import { XIcon } from "@animateicons/react/lucide/x-icon";
import { cn } from "cn";

type IconProps = Omit<ComponentProps<typeof PlusIcon>, "ref">;

// Keep sizing and control-wide triggers consistent across both icon-only and
// labelled controls. Decorative icons outside controls remain still.
function animatedIcon(Icon: typeof PlusIcon) {
  function AnimatedIcon({ className, size, style, isAnimated = true, id, ...props }: IconProps) {
    const generatedId = useId();
    const elementId = id ?? generatedId;
    const handle = useRef<IconHandle>(null);

    useEffect(() => {
      if (!isAnimated) return;
      const element = document.getElementById(elementId);
      const control = element?.closest<HTMLElement>('button, a[href], [role="menuitem"], [role="checkbox"], [data-slot="native-select-wrapper"]');
      if (!control) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const start = () => {
        if (!reducedMotion.matches && !control.matches(':disabled, [aria-disabled="true"], [data-disabled]') && !control.querySelector("select:disabled")) {
          handle.current?.startAnimation();
        }
      };
      const stop = () => { handle.current?.stopAnimation(); };
      const leave = () => { if (!control.matches(":focus-within")) stop(); };
      const blur = () => { if (!control.matches(":hover")) stop(); };
      const preferenceChanged = () => { if (reducedMotion.matches) stop(); };
      control.addEventListener("mouseenter", start);
      control.addEventListener("mouseleave", leave);
      control.addEventListener("focusin", start);
      control.addEventListener("focusout", blur);
      control.addEventListener("click", start);
      reducedMotion.addEventListener("change", preferenceChanged);
      return () => {
        control.removeEventListener("mouseenter", start);
        control.removeEventListener("mouseleave", leave);
        control.removeEventListener("focusin", start);
        control.removeEventListener("focusout", blur);
        control.removeEventListener("click", start);
        reducedMotion.removeEventListener("change", preferenceChanged);
      };
    }, [elementId, isAnimated]);

    return <Icon {...props} id={elementId} ref={handle} aria-hidden={props["aria-hidden"] ?? true}
      isAnimated={isAnimated} size={size ?? 16}
      className={cn("slotly-icon inline-flex size-4 shrink-0 align-middle [&>svg]:size-full", className)}
      style={{ ...(size === undefined ? {} : { width: size, height: size }), ...style }} />;
  }
  AnimatedIcon.displayName = `Animated${Icon.displayName ?? "Icon"}`;
  return AnimatedIcon;
}

export const Archive = /*#__PURE__*/ animatedIcon(ArchiveIcon);
export const Users = /*#__PURE__*/ animatedIcon(UsersIcon);
export const ArchiveRestore = /*#__PURE__*/ animatedIcon(RotateCcwIcon);
export const Bell = /*#__PURE__*/ animatedIcon(BellIcon);
export const CalendarCheck = /*#__PURE__*/ animatedIcon(CalendarCheckIcon);
export const CalendarClock = /*#__PURE__*/ animatedIcon(CalendarClockIcon);
export const CalendarDays = /*#__PURE__*/ animatedIcon(CalendarDaysIcon);
export const CalendarX2 = /*#__PURE__*/ animatedIcon(CalendarXIcon);
export const Check = /*#__PURE__*/ animatedIcon(CheckIcon);
export const CheckCheck = /*#__PURE__*/ animatedIcon(CheckCheckIcon);
export const ChevronDown = /*#__PURE__*/ animatedIcon(AnimatedChevronDown);
export const ChevronDownIcon = ChevronDown;
export const ChevronLeft = /*#__PURE__*/ animatedIcon(ChevronLeftIcon);
export const ChevronRight = /*#__PURE__*/ animatedIcon(ChevronRightIcon);
export const CircleCheckIcon = /*#__PURE__*/ animatedIcon(AnimatedCircleCheck);
export const Clock3 = /*#__PURE__*/ animatedIcon(ClockIcon);
export const Copy = /*#__PURE__*/ animatedIcon(CopyIcon);
export const EllipsisVertical = /*#__PURE__*/ animatedIcon(EllipsisVerticalIcon);
export const ExternalLink = /*#__PURE__*/ animatedIcon(ExternalLinkIcon);
export const ListChecks = /*#__PURE__*/ animatedIcon(ListChecksIcon);
export const LockKeyhole = /*#__PURE__*/ animatedIcon(LockIcon);
export const Menu = /*#__PURE__*/ animatedIcon(MenuIcon);
export const Pencil = /*#__PURE__*/ animatedIcon(PencilIcon);
export const Plus = /*#__PURE__*/ animatedIcon(PlusIcon);
export const Search = /*#__PURE__*/ animatedIcon(SearchIcon);
export const Settings = /*#__PURE__*/ animatedIcon(SettingsIcon);
export const Store = /*#__PURE__*/ animatedIcon(StoreIcon);
export const Trash2 = /*#__PURE__*/ animatedIcon(Trash2Icon);
export const UserX = /*#__PURE__*/ animatedIcon(UserXIcon);
export const X = /*#__PURE__*/ animatedIcon(XIcon);
