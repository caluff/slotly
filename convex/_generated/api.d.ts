/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appointmentArchive from "../appointmentArchive.js";
import type * as appointments from "../appointments.js";
import type * as availability from "../availability.js";
import type * as bookingLinks from "../bookingLinks.js";
import type * as businesses from "../businesses.js";
import type * as calendar from "../calendar.js";
import type * as clients from "../clients.js";
import type * as emailConfirmationValidators from "../emailConfirmationValidators.js";
import type * as emailConfirmations from "../emailConfirmations.js";
import type * as emailDispatch from "../emailDispatch.js";
import type * as lib_appointmentAttention from "../lib/appointmentAttention.js";
import type * as lib_appointmentCancellation from "../lib/appointmentCancellation.js";
import type * as lib_appointmentData from "../lib/appointmentData.js";
import type * as lib_appointmentRescheduling from "../lib/appointmentRescheduling.js";
import type * as lib_availability from "../lib/availability.js";
import type * as lib_clientIdentity from "../lib/clientIdentity.js";
import type * as lib_emailConfirmation from "../lib/emailConfirmation.js";
import type * as lib_privateCreation from "../lib/privateCreation.js";
import type * as lib_publicManagement from "../lib/publicManagement.js";
import type * as lib_scheduleForDate from "../lib/scheduleForDate.js";
import type * as lib_timeBlocks from "../lib/timeBlocks.js";
import type * as noticeValidators from "../noticeValidators.js";
import type * as publicAppearance from "../publicAppearance.js";
import type * as publicAppearanceValidators from "../publicAppearanceValidators.js";
import type * as publicBooking from "../publicBooking.js";
import type * as publicManagement from "../publicManagement.js";
import type * as publicManagementValidators from "../publicManagementValidators.js";
import type * as publicRescheduling from "../publicRescheduling.js";
import type * as publicReschedulingValidators from "../publicReschedulingValidators.js";
import type * as serviceValidators from "../serviceValidators.js";
import type * as services from "../services.js";
import type * as specialDateValidators from "../specialDateValidators.js";
import type * as specialDates from "../specialDates.js";
import type * as timeBlockValidators from "../timeBlockValidators.js";
import type * as timeBlocks from "../timeBlocks.js";
import type * as weeklySchedule from "../weeklySchedule.js";
import type * as weeklyScheduleValidators from "../weeklyScheduleValidators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appointmentArchive: typeof appointmentArchive;
  appointments: typeof appointments;
  availability: typeof availability;
  bookingLinks: typeof bookingLinks;
  businesses: typeof businesses;
  calendar: typeof calendar;
  clients: typeof clients;
  emailConfirmationValidators: typeof emailConfirmationValidators;
  emailConfirmations: typeof emailConfirmations;
  emailDispatch: typeof emailDispatch;
  "lib/appointmentAttention": typeof lib_appointmentAttention;
  "lib/appointmentCancellation": typeof lib_appointmentCancellation;
  "lib/appointmentData": typeof lib_appointmentData;
  "lib/appointmentRescheduling": typeof lib_appointmentRescheduling;
  "lib/availability": typeof lib_availability;
  "lib/clientIdentity": typeof lib_clientIdentity;
  "lib/emailConfirmation": typeof lib_emailConfirmation;
  "lib/privateCreation": typeof lib_privateCreation;
  "lib/publicManagement": typeof lib_publicManagement;
  "lib/scheduleForDate": typeof lib_scheduleForDate;
  "lib/timeBlocks": typeof lib_timeBlocks;
  noticeValidators: typeof noticeValidators;
  publicAppearance: typeof publicAppearance;
  publicAppearanceValidators: typeof publicAppearanceValidators;
  publicBooking: typeof publicBooking;
  publicManagement: typeof publicManagement;
  publicManagementValidators: typeof publicManagementValidators;
  publicRescheduling: typeof publicRescheduling;
  publicReschedulingValidators: typeof publicReschedulingValidators;
  serviceValidators: typeof serviceValidators;
  services: typeof services;
  specialDateValidators: typeof specialDateValidators;
  specialDates: typeof specialDates;
  timeBlockValidators: typeof timeBlockValidators;
  timeBlocks: typeof timeBlocks;
  weeklySchedule: typeof weeklySchedule;
  weeklyScheduleValidators: typeof weeklyScheduleValidators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
