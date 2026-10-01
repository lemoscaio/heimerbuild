import * as z from "zod/mini"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { track } from "@/lib/analytics/analytics"
import type { StoredValueOptions } from "@/lib/local-storage"
import type { ShopGrouping } from "@/types/shop-view"

const STORAGE_KEY = "heimerbuild:shop-grouping:v1"
const groupingStorage: StoredValueOptions<ShopGrouping> = {
	schema: z.enum(["tiers", "compact", "none"]),
	defaultValue: "tiers",
}

/** The shop grouping, kept per browser for every champion; the in-game tiers until one is picked. */
export function useShopGrouping() {
	const [grouping, saveGrouping] = useLocalStorage(STORAGE_KEY, groupingStorage)

	function setGrouping(next: ShopGrouping) {
		if (next === grouping) return
		saveGrouping(next)
		track("shop_view_changed", {
			setting: "grouping",
			from: grouping,
			to: next,
		})
	}

	return [grouping, setGrouping] as const
}
