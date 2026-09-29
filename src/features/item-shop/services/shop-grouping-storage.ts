import { z } from "zod"
import type { ShopGrouping } from "@/types/shop-view"

const STORAGE_KEY = "heimerbuild:shop-grouping:v1"
const DEFAULT_GROUPING: ShopGrouping = "tiers"

const groupingSchema = z.enum(["tiers", "compact", "none"])

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

/** This browser's shop grouping; the in-game tiers when unset, invalid or unavailable. */
export function readShopGrouping({
	storage = browserStorage(),
}: StorageOptions = {}): ShopGrouping {
	try {
		const parsed = groupingSchema.safeParse(storage?.getItem(STORAGE_KEY))
		return parsed.success ? parsed.data : DEFAULT_GROUPING
	} catch {
		return DEFAULT_GROUPING
	}
}

/** Saves the grouping for this browser. Never throws. */
export function saveShopGrouping(
	grouping: ShopGrouping,
	{ storage = browserStorage() }: StorageOptions = {},
) {
	try {
		storage?.setItem(STORAGE_KEY, grouping)
	} catch {
		// Full or blocked storage: the grouping lasts until the page reloads.
	}
}
