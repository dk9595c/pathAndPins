/**
 * In these sorts of nested-data situations I like to use a library to serialize
 * for me, or write a separate helper function for each data shape. Since we're
 * asking students to write these themselves, I wrote my own.
 *
 * @param rows An array of row arrays to serialize
 * @returns A legal CSV-formatted string encoding the entire table
 */
export function serializeCSV(rows: string[][]): string {
    if (rows.length === 0) return "";
    return rows.map(row =>
        row.map(cell => {
            if (!cell) return "";
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',')
    ).join('\n') + '\n';
}
