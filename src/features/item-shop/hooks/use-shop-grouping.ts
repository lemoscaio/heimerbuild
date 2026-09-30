import { useState } from "react"
import { track } from "@/lib/analytics/analytics"
import type { ShopGrouping } from "@/types/shop-view"
import {
	readShopGrouping,
	saveShopGrouping,
} from "../services/shop-grouping-storage"

/** The shop grouping, kept per browser for every champion. */
export function useShopGrouping() {
	const [grouping, setGroupingState] = useState(() => readShopGrouping())

	function setGrouping(next: ShopGrouping) {
		if (next === grouping) return
		setGroupingState(next)
		saveShopGrouping(next)
		track("shop_view_changed", {
			setting: "grouping",
			from: grouping,
			to: next,
		})
	}

	return [grouping, setGrouping] as const
}
