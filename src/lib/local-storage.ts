import type * as z from "zod/mini"

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

export type StorageOptions = {
	/** Defaults to `window.localStorage`; tests pass an in-memory one. */
	storage?: StorageLike
}

export type StoredValueOptions<Value> = StorageOptions & {
	schema: z.ZodMiniType<Value>
	defaultValue: Value
}

// Blocked storage (privacy settings) throws on access, not only on use.
function browserStorage(): StorageLike | undefined {
	try {
		return window.localStorage
	} catch {
		return undefined
	}
}

/** The raw stored string, `null` when unset, blocked or unavailable. Never throws. */
export function readStoredString(
	key: string,
	{ storage = browserStorage() }: StorageOptions = {},
) {
	try {
		return storage?.getItem(key) ?? null
	} catch {
		return null
	}
}

/** A raw stored string checked against the schema; the default when it fails. */
export function parseStoredValue<Value>(
	raw: string | null,
	{ schema, defaultValue }: Omit<StoredValueOptions<Value>, "storage">,
): Value {
	if (raw === null) return defaultValue
	const parsed = schema.safeParse(decode(raw))
	return parsed.success ? parsed.data : defaultValue
}

/** The stored value, or the default when unset, invalid, blocked or unavailable. Never throws. */
export function readLocalStorage<Value>(
	key: string,
	{ storage, ...options }: StoredValueOptions<Value>,
): Value {
	return parseStoredValue(readStoredString(key, { storage }), options)
}

/** Saves the value as JSON; `false` when full or blocked storage kept it out. Never throws. */
export function writeLocalStorage(
	key: string,
	value: unknown,
	{ storage = browserStorage() }: StorageOptions = {},
) {
	try {
		storage?.setItem(key, JSON.stringify(value))
		return storage !== undefined
	} catch {
		return false
	}
}

/** Forgets the stored value. Never throws. */
export function removeLocalStorage(
	key: string,
	{ storage = browserStorage() }: StorageOptions = {},
) {
	try {
		storage?.removeItem(key)
	} catch {
		// Blocked storage has nothing to forget.
	}
}

function decode(raw: string): unknown {
	try {
		return JSON.parse(raw)
	} catch {
		// Values saved before JSON (the shop grouping) are plain strings.
		return raw
	}
}
