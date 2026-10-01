import type { ChampionRole } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { ShopGrouping, ShopMode } from "@/types/shop-view"

/**
 * A shop search token. `value` is never typed text: the stat key (`stat`, `statMin`), the role
 * id, the match mode (`all` / `any`), the effect (`active` / `antiHeal`), the item group id,
 * the item id (`from` / `into`) or a 500-gold bucket (`gold`: `max:1500`, `min:3000`).
 */
export type ShopSearchToken = {
	kind:
		| "stat"
		| "role"
		| "match"
		| "has"
		| "group"
		| "from"
		| "into"
		| "statMin"
		| "gold"
	value: string
}

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
	 * `conditions`: the search-only filters (`has:active`, `from:sheen`, `ap>=80`...).
	 */
	shop_filtered: {
		roles: ChampionRole[]
		stats: StatKey[]
		match: "all" | "any"
		conditions: ShopSearchToken[]
	}
	/**
	 * Debounced shop search. `query`: the free text, trimmed, lowercased and cut to 50 characters;
	 * `tokens`: the filters in the search (role, stats, and the match mode when a stat is set);
	 * `results`: items shown after the search.
	 */
	shop_searched: {
		query: string
		queryLength: number
		tokens: ShopSearchToken[]
		results: number
		zeroResults: boolean
	}
	/** A shop search suggestion was picked; `position` is 1-based in the suggestion list. */
	shop_search_suggestion_picked: {
		kind: ShopSearchToken["kind"] | "item" | "shortcut"
		/** A token's `value`, the item id, or the shortcut's prefix (`from:`, `ap>=`). */
		value: string
		position: number
	}
	/** `null` stat and direction: back to the shop's own order. */
	shop_sorted: { stat: StatKey | null; direction: "asc" | "desc" | null }
	/** A shop view setting changed; the active view also rides on every event (`AnalyticsContext`). */
	shop_view_changed: {
		setting: "grouping"
		from: ShopGrouping
		to: ShopGrouping
	}
	/** A choice on the rune page; `id` is the tree, rune or stat shard id. */
	rune_picked: {
		slot:
			| "primary_tree"
			| "keystone"
			| "primary_rune"
			| "secondary_tree"
			| "secondary_rune"
			| "shard"
		id: number
	}
	/** The rune page was reset to empty. */
	runes_reset: Record<string, never>
	build_link_copied: {
		champion: string
		level: number
		itemsCount: number
		/** Whether the link carries at least one rune choice. */
		hasRunes: boolean
	}
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
