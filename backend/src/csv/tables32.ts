/*
  Starter for the tables32 library: handles. Uses a functional closure design,
  instead of classes, so we can use this example as a case study in week 2 or 3.
  In sprint 1, students modify the parse and search file included here.
  In sprint 2, they add Zod validation (without .transform(), this time).
*/

import { Readable } from "node:stream";
import { parseCSV as _parseCSV } from "./parse.js";
import { findFirst as _findFirst } from "./search.js";
import { toRecord } from "./utils.js";

/**
 * We want the library to give users a _handle_ to data, not the data directly.
 * We also want to ensure that handles can't be forged: if a caller has a
 * handle, it must have come from this module, and not just accidentally align.
 * So strings, numbers, and so on are very bad handles!
 *
 * We don't export this symbol, so it's very hard to accidentally forge it.
 *
 * Why not a string? Because s1 === s2 returns true if the strings have the same
 * content, even if they are different references. But symbols are raw
 * references, so harder to accidentally forge.
 *
 * Why "unique"? It has to do with the specifics of what [_Key] means. Without
 * "unique", the typechecker doesn't have enough information: as far as it
 * knows, any symbol would work.
 */
const _Key: unique symbol = Symbol();
type T32TableHandle = { readonly [_Key]: true; readonly uuid: string };

interface T32Manager {
  /**
   * Create a new table datasource.
   * Note well: the generator passed must produce _characters_, not lines.
   */
  parseCSV: (charSource: Readable) => Promise<T32TableHandle>;
  findFirst: (
    h: T32TableHandle,
    target: string,
  ) => Record<string, string> | undefined;
  getData: (h: T32TableHandle) => Record<string, string>[] | undefined;
  close: (h: T32TableHandle) => boolean;
}

/**
 * Factory for the library. Call this to generate a data manager; data sets
 * belong to a single manager only, so you usually only want one of these.
 *
 * Yes, TypeScript has classes, but (for important teaching reasons) we aren't
 * using them unless absolutely necessary. So we'll use a Map here because it's
 * the right tool for the job, but we aren't making a class to represent the
 * manager.
 *
 * How does this work? We'll talk about it in class. For now, notice that this format
 * has many similarities to the way you'd write a class in Java or Python: instance
 * data fields, public methods, ...
 */
export function makeTables32(): T32Manager {
  /**
   * Tables are internally keyed by unique identifiers. This means that two
   * different handles can refer to the same internal table.
   */
  const _tables: Map<string, string[][]> = new Map();

  async function parseCSV(charSource: Readable): Promise<T32TableHandle> {
    const rows = await _parseCSV(charSource);
    const handle: T32TableHandle = { [_Key]: true, uuid: crypto.randomUUID() };
    _tables.set(handle.uuid, rows);
    return handle;
  }
/**
 * Caller of students' findFirst function. Returns search result formatted in a record, or undefined if data is invalid
 */
  function findFirst(
    h: T32TableHandle,
    target: string,
  ): Record<string, string> | undefined {
    const raw = _tables.get(h.uuid);
    if (raw === undefined || raw.length < 1) return undefined;
    const [headers, ...data] = raw;
    const result = _findFirst(data, target);
    if(result !== undefined) return toRecord(result, headers);
    return undefined
  }

  function getData(h: T32TableHandle): Record<string, string>[] | undefined {
    const raw = _tables.get(h.uuid);
    if (raw === undefined || raw.length < 1) return undefined;
    const [headers, ...data] = raw;
    // TN: a mistake I made:
    // Without the raw.length check above, headers _could_ be undefined at this point,
    // contrary to the inferred type of string[]. We could enable checking indexed access
    // (noUncheckedIndexedAccess) but the ergonomics can be very bad. So we add another condition
    // to the undefined return above.
    const result = data.map((r) => toRecord(r, headers));
    // Today's TypeScript infers a type predicate here automatically. :-)
    return result.every((r) => r !== undefined) ? result : undefined;
  }

  function close(h: T32TableHandle): boolean {
    return _tables.delete(h.uuid);
  }

  return {
    parseCSV: parseCSV,
    findFirst: findFirst,
    getData: getData,
    close: close,
  };
}
