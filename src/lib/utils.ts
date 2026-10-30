/**
 * @fileoverview Utility functions for Planista styling, date manipulation, and financial formatting.
 * Strictly typed with full deterministic boundary safeguards.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional CSS classes cleanly using clsx and tailwind-merge,
 * resolving any conflicting Tailwind utility classes deterministically.
 *
 * @param inputs - List of class values, objects, or arrays to merge.
 * @returns Fully merged and conflict-free class name string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric monetary quantity into a localized currency string.
 * Uses integer/zero-decimal rounding for event budget overviews with fallback protection.
 *
 * @param amount - The numerical monetary value to format.
 * @param currency - ISO 4217 3-letter currency code (defaults to "INR").
 * @returns Formatted currency representation (e.g. "₹45,000" or "$1,200").
 */
export function formatCurrency(amount: number, currency: string = "INR"): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * Formats a Date object or ISO 8601 string into a human-readable calendar representation.
 *
 * @param date - ISO date string or Date instance.
 * @returns Formatted calendar date (e.g. "Oct 29, 2026").
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
