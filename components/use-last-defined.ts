"use client";

import { useState } from "react";

// Retain the current account's last result during session recovery. State lives
// only in this mounted subtree; it is never shared across requests or accounts.
export function useLastDefined<T>(value: T | undefined) {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value === undefined ? last : value;
}
