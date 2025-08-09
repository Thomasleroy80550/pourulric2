import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts a value to a string, returning undefined if the value is null or undefined.
 * @param v The value to convert.
 * @returns The string representation of the value, or undefined.
 */
export const asString = (v: unknown): string | undefined =>
  v == null ? undefined : String(v);