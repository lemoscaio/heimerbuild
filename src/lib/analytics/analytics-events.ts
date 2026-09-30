import type { ShopGrouping, ShopMode } from "@/types/shop-view"
import type { ChampionRole } from "../../../scripts/sync-data/schemas/champion"
import type { StatKey } from "../../../scripts/sync-data/schemas/item"

/** Every custom PostHog event and its properties. Add an event here before tracking it. */
export type AnalyticsEvents = {
	/** A champion card was clicked on the home page. `champion` is the champion key. */
	champion_selected: { champion: string }
	/** The level select changed, or the slider was released on a new level. */
	level_changed: { level: number }
	/** A shop item was selected to see its details and a stats preview. */
	shop_item_selected: { itemId: string }
	item_added: { itemId: string }
	item_removed: { itemId: string }
	/**
	 * The shop filters after a change; an empty list means no filter of that kind.
	 * `match`: items need every selected stat (`all`, AND) or at least one (`any`, OR).
	 */
	shop_filtered: {
		roles: ChampionRole[]
		stats: StatKey[]
		match: "all" | "any"
	}
	/** Debounced shop search; only the query length is sent, never the text. */
	shop_searched: { queryLength: number }
	/** `null` stat and direction: back to the shop's own order. */
	shop_sorted: { stat: StatKey | null; direction: "asc" | "desc" | null }
	/** A shop view setting changed; the active view also rides on every event (`AnalyticsContext`). */
	shop_view_changed: {
		setting: "grouping"
		from: ShopGrouping
		to: ShopGrouping
	}
	build_link_copied: { champion: string; level: number; itemsCount: number }
	/** The "Not possible in-game" warning appeared or changed; `rules` are the broken item groups. */
	impossible_build_warning_shown: { rules: string[] }
}

export type AnalyticsEvent = keyof AnalyticsEvents

/** The active view, sent with every event as PostHog super properties. */
export type AnalyticsContext = {
	shop_grouping?: ShopGrouping
	shop_mode?: ShopMode
	shop_stat_match?: "all" | "any"
}
