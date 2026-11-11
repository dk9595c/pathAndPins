import { z } from "zod";

/**
 * Schema definition for an initial activity location row.
 *
 * Fields:
 * - `name`: Name of the location.
 * - `lat`: Latitude coordinate.
 * - `lng`: Longitude coordinate.
 */
export const RowSchema = z.object({
  name: z.coerce.string(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

/**
 * Type representation of a validated location row,
 * inferred from `RowSchema`.
 */
export type Row = z.infer<typeof RowSchema>;
