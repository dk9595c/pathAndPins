// Students implement

export class CSVSearchError extends Error {
    constructor(message: string, public searchTarget: string) {
        super(message);
        this.name = "CSVSearchError";
    }
}

//Task B
export function findFirst(data: string[][], target: string): string[] | undefined {
    if (!target || target.trim() === "") {
        throw new CSVSearchError("Search query cannot be empty", target);
    }

    for (const row of data) {
        if (row.some(cell => cell && cell.includes(target))) {
            return row;
        }
    }
    return undefined;
}
