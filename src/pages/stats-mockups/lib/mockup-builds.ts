import type { EffectOverrides } from "@/lib/effects/effect"
import type { AbilityRanks } from "@/lib/stats/rank-stats"

export const MOCKUP_BUILD_IDS = ["jinx", "lux", "garen"] as const

export type MockupBuildId = (typeof MOCKUP_BUILD_IDS)[number]

/** A fixed build the prototype shows, read through the real stats engine. */
export type MockupBuild = {
	id: MockupBuildId
	championKey: string
	level: number
	itemIds: readonly string[]
	/** The shop item the "preview" switch adds, as hovering it in the shop does. */
	previewItemId: string
	shardIds: readonly number[]
	ranks: AbilityRanks
	overrides: EffectOverrides
}

export const MOCKUP_BUILDS: Readonly<Record<MockupBuildId, MockupBuild>> = {
	jinx: {
		id: "jinx",
		championKey: "Jinx",
		level: 13,
		// Berserker's Greaves, Kraken Slayer, Infinity Edge, Runaan's Hurricane.
		itemIds: ["3006", "6672", "3031", "3085"],
		previewItemId: "3046", // Phantom Dancer
		shardIds: [5005, 5008, 5001],
		ranks: { Q: 3, W: 5, E: 3, R: 2 },
		overrides: { "jinx-q-revd-up": true },
	},
	lux: {
		id: "lux",
		championKey: "Lux",
		level: 11,
		// Sorcerer's Shoes, Luden's Echo, Shadowflame, Rabadon's Deathcap.
		itemIds: ["3020", "6655", "4645", "3089"],
		previewItemId: "3135", // Void Staff
		shardIds: [5008, 5008, 5001],
		ranks: { Q: 3, W: 1, E: 5, R: 2 },
		overrides: {},
	},
	garen: {
		id: "garen",
		championKey: "Garen",
		level: 11,
		// Stridebreaker, Plated Steelcaps, Dead Man's Plate, Sterak's Gage.
		itemIds: ["6631", "3047", "3742", "3053"],
		previewItemId: "3075", // Thornmail
		shardIds: [5008, 5008, 5011],
		ranks: { Q: 3, W: 1, E: 5, R: 2 },
		overrides: {},
	},
}
