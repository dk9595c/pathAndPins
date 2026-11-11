/*
  Helpers for converting to records and processing different kinds 
  of data-sources. This would be given to students as part of the
  git repo's starter code.
*/

// Don't neglect to import open like this, or TypeScript may infer it's from the DOM.
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline'

/**
 * Convert the given data row to a record object, given the headers.
 *
 * TODO: technically should return more structured errors, here
 * TODO: using Record<string,string> risks overwriting prototype methods, but that's fine here.
 *    Note Record<string, string> is just sugar for "JS object with string keys and string values"
 *
 * @param row The table row to convert
 * @param headers The field names for this data set
 */
export function toRecord(row: string[], headers: string[]): Record<string, string> | undefined {
  if (row.length !== headers.length) return undefined;
  if (row.length < 1) return undefined;
  const result: Record<string,string> = {} // note: need to give the explicit type here
  row.forEach( (val,idx) => {result[headers[idx]] = val })
  return result
}

////////////////////////////

/**
 * Tagged union of all supported input datatypes. 
 * Notice how this makes it convenient to distinguish between strings
 * that are data and strings that are file paths.
 */
type TableDataSource =
  | { kind: 'string'; value: string }
  | { kind: 'file'; path: string }
  | { kind: 'stream'; stream: Readable };

  /**
   * Convert any supported datasource to a unified datatype. 
   * @param src The raw data source for this set of tabular data
   * @returns a Readable that can be read from generically
   */
export function toReadable(src: TableDataSource): Readable {
  switch (src.kind) {
    case 'string': return Readable.from(src.value);
    case 'file':   return createReadStream(src.path, { encoding: 'utf8' });
    case 'stream': return src.stream;
  }
}

/**
 * For internal functions that need to consume data by _lines_
 * @param src A generic readable object for the data source
 * @returns An asyncronous generator of line strings
 */
export function getLinesFromReadable(readable: Readable): AsyncIterable<string> {
  return createInterface({ input: readable, crlfDelay: Infinity });
}

/**
 * For internal functions that need to consume data by _characters_
 * 
 * // TODO: consider error handling in these helpers 
 * 
 * @param src A generic readable object for the data source
 * @returns An asynchronous generator of line strings
 */
export async function* getCharsFromReadable(theReadable: Readable): AsyncIterable<string> {
  let previousCR = false
  for await(const chunk of theReadable) {
    for(const char of chunk) {
      if (previousCR && char === '\n') {
          // Second half of Windows-style CRLF pair. 
          // Already yielded an endline for the CR, skip the LF.
          previousCR = false
          continue
        }
      previousCR = (char === '\r')
      // If we're processing a CR character, normalize it to LF.
      yield previousCR ? '\n' : char
    }
  }
}
