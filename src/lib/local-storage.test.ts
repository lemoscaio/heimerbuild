import { describe, expect, test } from "bun:test"
import * as z from "zod/mini"
import {
	readLocalStorage,
	removeLocalStorage,
	writeLocalStorage,
} from "./local-storage"

function memoryStorage(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial))
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value)
		},
		removeItem: (key: string) => {
			values.delete(key)
		},
	}
}

const blockedStorage = {
	getItem: (): string | null => {
		throw new DOMException("Blocked", "SecurityError")
	},
	setItem: () => {
		throw new DOMException("Blocked", "SecurityError")
	},
	removeItem: () => {
		throw new DOMException("Blocked", "SecurityError")
	},
}

const KEY = "heimerbuild:test:v1"
const grouping = {
	schema: z.enum(["tiers", "compact", "none"]),
	defaultValue: "tiers" as const,
}

describe("local storage", () => {
	test("reads the default when nothing is stored", () => {
		expect(
			readLocalStorage(KEY, { ...grouping, storage: memoryStorage() }),
		).toBe("tiers")
	})

	test("reads back what was written", () => {
		const storage = memoryStorage()
		expect(writeLocalStorage(KEY, "compact", { storage })).toBe(true)
		expect(readLocalStorage(KEY, { ...grouping, storage })).toBe("compact")

		const expanded = { schema: z.boolean(), defaultValue: false, storage }
		writeLocalStorage(KEY, true, { storage })
		expect(readLocalStorage(KEY, expanded)).toBe(true)
	})

	test("reads the default for a value its schema rejects", () => {
		const storage = memoryStorage({ [KEY]: '"tiles"' })
		expect(readLocalStorage(KEY, { ...grouping, storage })).toBe("tiers")
		storage.setItem(KEY, "{not json")
		expect(
			readLocalStorage(KEY, {
				schema: z.array(z.string()),
				defaultValue: [],
				storage,
			}),
		).toEqual([])
	})

	test("reads a value saved as a plain string before JSON", () => {
		const storage = memoryStorage({ [KEY]: "compact" })
		expect(readLocalStorage(KEY, { ...grouping, storage })).toBe("compact")
	})

	test("forgets a removed value", () => {
		const storage = memoryStorage()
		writeLocalStorage(KEY, "none", { storage })
		removeLocalStorage(KEY, { storage })
		expect(readLocalStorage(KEY, { ...grouping, storage })).toBe("tiers")
	})

	test("never throws when storage is blocked", () => {
		const storage = blockedStorage
		expect(readLocalStorage(KEY, { ...grouping, storage })).toBe("tiers")
		expect(writeLocalStorage(KEY, "none", { storage })).toBe(false)
		expect(() => removeLocalStorage(KEY, { storage })).not.toThrow()
	})
})
