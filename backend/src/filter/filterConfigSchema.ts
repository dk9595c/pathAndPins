import { z } from "zod";

/**
 * Schema for supported filter operators.
 */
export const OperatorSchema = z.enum(["==", ">=", "<=", "contains"]);
export type FilterOperator = z.infer<typeof OperatorSchema>;

/**
 * Schema for a single filter condition.
 *
 * Fields:
 * - `operator`: One of the supported operators.
 * - `value`: The comparison value (string or number).
 */
export const FilterConditionSchema = z.object({
  operator: OperatorSchema,
  value: z.union([z.coerce.string(), z.coerce.number()]),
});

/**
 * Schema for a filter value, which may be either:
 * - A boolean (for exact true/false checks).
 * - A filter condition (operator + value).
 */
export const FilterValueSchema = z.union([z.boolean(), FilterConditionSchema]);

/**
 * Schema for the full filter configuration.
 */
export const FilterConfigSchema = z.record(FilterValueSchema);

/**
 * Type representing a validated filter configuration.
 */
export type FilterConfig = z.infer<typeof FilterConfigSchema>;

/**
 * Function signature for an operator-based comparison.
 *
 * @param rowValue - Value from the row being evaluated.
 * @param conditionValue - Value from the filter condition.
 * @returns Whether the condition passes.
 */
export type OperatorFunction = (rowValue: any, conditionValue: any) => boolean;
