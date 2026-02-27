import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts Mongoose objects/documents to plain objects for Server Actions serialization.
 */
export function pojoify<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
