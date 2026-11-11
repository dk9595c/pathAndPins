import { z } from "zod";

/**
 * Schema definition for a single activity row.
 *
 * Fields:
 * - `id`: Unique identifier for the activity.
 * - `name`: Name of the activity.
 * - `duration`: Duration of the activity (coerced to a number).
 * - `lat`: Latitude coordinate (coerced to a number).
 * - `lng`: Longitude coordinate (coerced to a number).
 * - `description`: Optional text description of the activity.
 * - `redliningGrade`: Optional redlining grade classification.
 * - `temperature`: Optional temperature value.
 * - `condition`: Optional condition string.
 */
export const RowSchema = z.object({
  id: z.string(),
  name: z.string(),
  duration: z.coerce.number(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  description: z.string().optional(),
  redliningGrade: z.string().optional(),
  temperature: z.number().optional(),
  condition: z.string().optional(),
});

/**
 * Type representation of a validated activity row,
 * inferred from `RowSchema`.
 */
export type Row = z.infer<typeof RowSchema>;
