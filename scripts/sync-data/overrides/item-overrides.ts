import type { Item } from "../schemas/item"
import type { DataOverride, FieldOverride } from "./apply-overrides"

export type ItemOverride = DataOverride<Item>

export function defineItemOverride<Field extends keyof Item>({
	itemId,
	...override
}: Omit<FieldOverride<Item, Field>, "target"> & {
	itemId: string
}): FieldOverride<Item, Field> {
	return { ...override, target: itemId }
}

/** Upgrades of World Atlas, [item id, override id prefix]. */
const SUPPORT_QUEST_REWARDS = [
	["3869", "celestial-opposition"],
	["3870", "dream-maker"],
	["3871", "zazzaks-realmspike"],
	["3876", "solstice-sleigh"],
	["3877", "bloodsong"],
] as const

/** Fixes for bugs in Riot's item data; see "Data overrides" in the README. */
export const ITEM_OVERRIDES: readonly ItemOverride[] = [
	defineItemOverride({
		id: "gunmetal-greaves-boots-tag",
		itemId: "3172",
		field: "tags",
		since: "16.19",
		reason:
			"Riot tags it NonbootsMovement (move speed from a non-boots item, as on Phantom Dancer or Zeal) instead of Boots, but it is the Berserker's Greaves upgrade and shares the Boots group limit",
		source: "https://github.com/lemoscaio/heimerbuild/issues/159",
		apply: (tags) =>
			tags.map((tag) => (tag === "NonbootsMovement" ? "Boots" : tag)),
	}),
	defineItemOverride({
		id: "world-atlas-health-regen-tag",
		itemId: "3865",
		field: "tags",
		since: "16.19",
		reason:
			"Riot tags it Health, but it has no health stat; it gives 50% base health regen, and its upgrades are tagged HealthRegen",
		source: "https://wiki.leagueoflegends.com/en-us/World_Atlas",
		apply: (tags) =>
			tags.map((tag) => (tag === "Health" ? "HealthRegen" : tag)),
	}),
	defineItemOverride({
		id: "titanic-hydra-no-health-regen-tag",
		itemId: "3748",
		field: "tags",
		since: "16.19",
		reason:
			"Riot tags it HealthRegen, a leftover from an older version: it has no health regen stat",
		source: "https://wiki.leagueoflegends.com/en-us/Titanic_Hydra",
		apply: (tags) => tags.filter((tag) => tag !== "HealthRegen"),
	}),
	defineItemOverride({
		id: "stormsurge-no-gold-per-tag",
		itemId: "4646",
		field: "tags",
		since: "16.19",
		reason:
			"Riot tags it GoldPer, but neither its stats nor its passive give gold income",
		source: "https://wiki.leagueoflegends.com/en-us/Stormsurge",
		apply: (tags) => tags.filter((tag) => tag !== "GoldPer"),
	}),
	...SUPPORT_QUEST_REWARDS.map(([itemId, name]) =>
		defineItemOverride({
			id: `${name}-support-role`,
			itemId,
			field: "roles",
			since: "16.19",
			reason:
				"Riot gives this support quest reward no shop class, so the Support filter hides it; World Atlas, which it upgrades from, is Support",
			source: "https://github.com/lemoscaio/heimerbuild/issues/177",
			apply: (roles) => (roles.length > 0 ? roles : ["SUPPORT"]),
		}),
	),
]
