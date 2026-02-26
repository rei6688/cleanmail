import { z } from "zod";

export const ScanOptionsSchema = z
  .object({
    ruleId: z.string().optional(),
    yearFrom: z.coerce.number().int().min(2000).max(2100).optional(),
    yearTo: z.coerce.number().int().min(2000).max(2100).optional(),
    preview: z.boolean().default(true),
  })
  .refine(
    (data) =>
      data.yearFrom === undefined ||
      data.yearTo === undefined ||
      data.yearFrom <= data.yearTo,
    { message: "yearFrom must be <= yearTo" }
  );

export const OrganizeOptionsSchema = z
  .object({
    ruleId: z.string().optional(),
    yearFrom: z.coerce.number().int().min(2000).max(2100).optional(),
    yearTo: z.coerce.number().int().min(2000).max(2100).optional(),
    dryRun: z.boolean().default(false),
  })
  .refine(
    (data) =>
      data.yearFrom === undefined ||
      data.yearTo === undefined ||
      data.yearFrom <= data.yearTo,
    { message: "yearFrom must be <= yearTo" }
  );

export type ScanOptionsInput = z.infer<typeof ScanOptionsSchema>;
export type OrganizeOptionsInput = z.infer<typeof OrganizeOptionsSchema>;
