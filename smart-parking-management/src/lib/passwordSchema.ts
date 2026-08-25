import { z } from "zod"

/**
 * Strong password validation rules:
 * - Minimum 8 characters
 * - At least 1 uppercase letter (A–Z)
 * - At least 1 lowercase letter (a–z)
 * - At least 1 number (0–9)
 * - At least 1 special character (!@#$%^&*)
 * - No spaces
 */
export const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((val) => !/\s/.test(val), { message: "Password must not contain spaces" })
  .refine((val) => /[A-Z]/.test(val), { message: "Password must contain at least 1 uppercase letter (A–Z)" })
  .refine((val) => /[a-z]/.test(val), { message: "Password must contain at least 1 lowercase letter (a–z)" })
  .refine((val) => /[0-9]/.test(val), { message: "Password must contain at least 1 number (0–9)" })
  .refine((val) => /[!@#$%^&*]/.test(val), { message: "Password must contain at least 1 special character (!@#$%^&*)" })
