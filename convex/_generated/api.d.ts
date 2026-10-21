/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appointments from "../appointments.js";
import type * as availability from "../availability.js";
import type * as bookingLinks from "../bookingLinks.js";
import type * as businesses from "../businesses.js";
import type * as lib_appointmentData from "../lib/appointmentData.js";
import type * as lib_availability from "../lib/availability.js";
import type * as publicBooking from "../publicBooking.js";
import type * as services from "../services.js";
import type * as weeklySchedule from "../weeklySchedule.js";
import type * as weeklyScheduleValidators from "../weeklyScheduleValidators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appointments: typeof appointments;
  availability: typeof availability;
  bookingLinks: typeof bookingLinks;
  businesses: typeof businesses;
  "lib/appointmentData": typeof lib_appointmentData;
  "lib/availability": typeof lib_availability;
  publicBooking: typeof publicBooking;
  services: typeof services;
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
