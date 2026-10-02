import { readFile } from "node:fs/promises"

/** A JSON file's parsed content, unchecked: callers validate it with their schema. */
export async function readJson(path: string): Promise<unknown> {
	return JSON.parse(await readFile(path, "utf8"))
}
