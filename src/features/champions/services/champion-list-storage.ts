const STORAGE_KEY = "heimerbuild:home-champions-expanded:v1"

type StorageOptions = {
	storage?: Pick<Storage, "getItem" | "setItem">
}

// Blocked storage (privacy settings) throws on access, not only on use.
function browserStorage() {
	try {
		return window.localStorage
	} catch {
		return undefined
	}
}

/** Whether the home page's champion list was left open; collapsed on a first visit. */
export function readChampionListExpanded({
	storage = browserStorage(),
}: StorageOptions = {}) {
	try {
		return storage?.getItem(STORAGE_KEY) === "true"
	} catch {
		return false
	}
}

/** Remembers the list state for the next visit. Never throws. */
export function saveChampionListExpanded(
	expanded: boolean,
	{ storage = browserStorage() }: StorageOptions = {},
) {
	try {
		storage?.setItem(STORAGE_KEY, String(expanded))
	} catch {
		// Full or blocked storage: the next visit starts collapsed.
	}
}
