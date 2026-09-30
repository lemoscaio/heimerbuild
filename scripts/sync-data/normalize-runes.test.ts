import { describe, expect, test } from "bun:test"
import perks from "./fixtures/runes/perks.json"
import perkStyles from "./fixtures/runes/perkstyles.json"
import runesReforged from "./fixtures/runes/runesReforged.json"
import {
	fillPlaceholders,
	normalizeRunes,
	parseShardStats,
} from "./normalize-runes"

// Fixtures are trimmed copies of the Data Dragon 16.19.1 / CommunityDragon 16.19 cache.
const VERSION = "16.19.1"

function runes() {
	return normalizeRunes(runesReforged, perks, perkStyles, VERSION)
}

describe("normalizeRunes", () => {
	test("lists the five trees in the in-game order, each with keystones and three rows", () => {
		const { trees } = runes()
		expect(trees.map((tree) => tree.name)).toEqual([
			"Precision",
			"Domination",
			"Sorcery",
			"Resolve",
			"Inspiration",
		])
		for (const tree of trees) {
			expect(tree.keystones.length).toBeGreaterThanOrEqual(3)
			expect(tree.rows).toHaveLength(3)
		}
		const sorcery = trees.find((tree) => tree.key === "Sorcery")
		expect(sorcery?.keystones.map((rune) => rune.name)).toContain(
			"Arcane Comet",
		)
		expect(sorcery?.rows[2]?.map((rune) => rune.name)).toEqual([
			"Scorch",
			"Waterwalking",
			"Gathering Storm",
		])
	})

	test("turns rune descriptions into plain text", () => {
		const electrocute = runes()
			.trees.flatMap((tree) => tree.keystones)
			.find((rune) => rune.key === "Electrocute")
		expect(electrocute?.description).toBe(
			"Hitting a champion with 3 separate attacks or abilities in 3s deals bonus adaptive damage.",
		)
	})

	test("keeps the long description with its numbers as rich text", () => {
		const bloodline = runes()
			.trees.flatMap((tree) => tree.rows.flat())
			.find((rune) => rune.key === "LegendBloodline")
		expect(bloodline?.longDescription[0]?.[0]).toEqual([
			{ text: "Gain 0.45% Life Steal for every " },
			{ text: "Legend", italic: true },
			{ text: " stack (max 15 stacks). At maximum " },
			{ text: "Legend", italic: true },
			{ text: " stacks, gain 85 max health." },
		])
	})

	test("fills the placeholders Data Dragon leaves in long descriptions", () => {
		const text = JSON.stringify(
			runes().trees.flatMap((tree) => [...tree.keystones, ...tree.rows.flat()]),
		)
		expect(text).not.toMatch(/@\w+@/)
		expect(text).toContain("initial swap cooldown is 270 seconds")
	})

	test("reads the three shard rows shared by every tree", () => {
		expect(runes().shardRows).toEqual([
			{ label: "Offense", shardIds: [5008, 5005, 5007] },
			{ label: "Flex", shardIds: [5008, 5010, 5001] },
			{ label: "Defense", shardIds: [5011, 5013, 5001] },
		])
	})

	test("takes shard values from their descriptions, percents as fractions", () => {
		const stats = Object.fromEntries(
			runes().shards.map((shard) => [shard.name, shard.stats]),
		)
		expect(stats).toEqual({
			"Adaptive Force": [{ stat: "adaptiveForce", min: 9, max: 9 }],
			"Attack Speed": [{ stat: "attackSpeedPercent", min: 0.1, max: 0.1 }],
			"Ability Haste": [{ stat: "abilityHaste", min: 8, max: 8 }],
			"Move Speed": [{ stat: "movementSpeedPercent", min: 0.025, max: 0.025 }],
			"Health Scaling": [{ stat: "health", min: 10, max: 180 }],
			Health: [{ stat: "health", min: 65, max: 65 }],
			"Tenacity and Slow Resist": [
				{ stat: "tenacityPercent", min: 0.15, max: 0.15 },
				{ stat: "slowResistPercent", min: 0.15, max: 0.15 },
			],
		})
	})

	test("stores shard icons as Data Dragon image paths", () => {
		const adaptive = runes().shards.find((shard) => shard.id === 5008)
		expect(adaptive?.icon).toBe(
			"perk-images/StatMods/StatModsAdaptiveForceIcon.png",
		)
	})

	test("fails when a tree lists different shard rows", () => {
		const styles = structuredClone(perkStyles)
		const slot = styles.styles[1]?.slots[0]
		if (slot) slot.perks = [5008, 5005, 5010]
		expect(() => normalizeRunes(runesReforged, perks, styles, VERSION)).toThrow(
			"different stat shard rows",
		)
	})

	test("fails when a shard row points at a perk that is missing", () => {
		const withoutHealth = perks.filter((perk) => perk.id !== 5011)
		expect(() =>
			normalizeRunes(runesReforged, withoutHealth, perkStyles, VERSION),
		).toThrow("shard 5011 is missing")
	})
})

describe("fillPlaceholders", () => {
	test("fails on a placeholder it has no value for instead of shipping it", () => {
		expect(() => fillPlaceholders("Electrocute", "Deals @Damage@.")).toThrow(
			"unresolved @Damage@",
		)
	})
})

describe("parseShardStats", () => {
	test("reads a level-scaling range", () => {
		expect(parseShardStats(5001, "+15-200 Health (based on level)")).toEqual([
			{ stat: "health", min: 15, max: 200 },
		])
	})

	test("fails on a reworded description instead of guessing", () => {
		expect(() => parseShardStats(5011, "+65 Bonus Health")).toThrow(
			"does not match",
		)
	})

	test("fails on a shard it has no rule for", () => {
		expect(() => parseShardStats(5002, "+6 Armor")).toThrow(
			"no SHARD_STAT_RULES entry",
		)
	})
})
