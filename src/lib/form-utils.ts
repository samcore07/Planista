/**
 * @fileoverview Safe form data extraction and parsing utilities.
 * Eliminates unsafe type assertions ('as string') when processing multi-part form payloads.
 */

/**
 * Extracts a required string from FormData, trimmed of whitespace.
 */
export function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Extracts an optional string from FormData, returning null if empty or absent.
 */
export function getOptionalFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extracts a numeric value from FormData, returning a valid finite number or default fallback.
 */
export function getFormNumber(formData: FormData, key: string, fallback: number = 0): number {
  const value = formData.get(key);
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Extracts an optional number from FormData, returning null if empty or non-finite.
 */
export function getOptionalFormNumber(formData: FormData, key: string): number | null {
  const value = formData.get(key);
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
