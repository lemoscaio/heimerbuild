import { describe, expect, test } from "bun:test"
import type { ChampionStats } from "@schemas/champion"
import { formatStat, resourceDisplay, statDisplay } from "@/lib/stat-display"
import { computeStats } from "@/lib/stats/compute-stats"
import { championStatRows, keyStatRows } from "./stats-info"

describe("formatStat", () => {
	test.each([
		{
			case: "flat, up to 2 decimals",
			value: 7.456,
			format: "flat",
			shown: "7.46",
		},
		{ case: "flat, whole", value: 558, format: "flat", shown: "558" },
		{ case: "percent fraction", value: 0.25, format: "percent", shown: "25%" },
		{
			case: "percent, one decimal",
			value: 0.025,
			format: "percent",
			shown: "2.5%",
		},
		{
			case: "attack speed, attacks per second without %",
			value: 0.658,
			format: "attackSpeed",
			shown: "0.658",
		},
	] as const)("$case", ({ value, format, shown }) => {
		expect(formatStat(value, format)).toBe(shown)
	})
})

function statsOf(
	resource: string,
	{ mana, manaRegen }: { mana: number; manaRegen: number },
) {
	const flat = { base: 0, perLevel: 0 }
	const stats: ChampionStats = {
		health: flat,
		healthRegen: flat,
		mana: { base: mana, perLevel: 0 },
		manaRegen: { base: manaRegen, perLevel: 0 },
		armor: flat,
		magicResist: flat,
		attackDamage: flat,
		attackSpeed: { base: 0.625, perLevelPercent: 0, ratio: 0.625 },
		critChance: flat,
		movementSpeed: flat,
		attackRange: flat,
	}
	return computeStats({ resource, stats }, 1, [])
}

describe("championStatRows", () => {
	function resourceRows(
		resource: string,
		values = { mana: 200, manaRegen: 50 },
	) {
		return championStatRows(resource, statsOf(resource, values))
			.filter(({ stat }) => stat === "mana" || stat === "manaRegen")
			.map(({ stat, label }) => [stat, label])
	}

	test("mana champions keep the mana rows", () => {
		expect(resourceRows("MANA")).toEqual([
			["mana", "Mana"],
			["manaRegen", "Mana Regen"],
		])
	})

	test("other resources rename the rows", () => {
		expect(resourceRows("ENERGY")).toEqual([
			["mana", "Energy"],
			["manaRegen", "Energy Regen"],
		])
	})

	test("both resource rows show the resource's icon", () => {
		const icons = championStatRows(
			"ENERGY",
			statsOf("ENERGY", { mana: 200, manaRegen: 50 }),
		)
			.filter(({ stat }) => stat === "mana" || stat === "manaRegen")
			.map(({ icon }) => icon)

		expect(icons).toEqual([
			resourceDisplay("ENERGY").icon,
			resourceDisplay("ENERGY").icon,
		])
		expect(icons).not.toContain(statDisplay.mana.icon)
	})

	test("a resource without regen drops only the regen row", () => {
		expect(resourceRows("FURY", { mana: 100, manaRegen: 0 })).toEqual([
			["mana", "Fury"],
		])
	})

	test("a resource with no value drops both rows", () => {
		expect(resourceRows("GRIT", { mana: 0, manaRegen: 0 })).toEqual([])
	})

	// Viego's data ships a 10000 mana placeholder with resource NONE.
	test("champions without a resource have no resource rows", () => {
		expect(resourceRows("NONE", { mana: 10000, manaRegen: 0 })).toEqual([])
	})

	test("every other stat row stays", () => {
		const rows = championStatRows(
			"NONE",
			statsOf("NONE", { mana: 0, manaRegen: 0 }),
		)

		expect(rows.map(({ stat }) => stat)).toContain("health")
		expect(rows.map(({ stat }) => stat)).toContain("abilityHaste")
	})
})

describe("keyStatRows", () => {
	function keyStats(resource: string, values = { mana: 200, manaRegen: 50 }) {
		return keyStatRows(
			championStatRows(resource, statsOf(resource, values)),
		).map(({ stat }) => stat)
	}

	const fixedStats = [
		"abilityPower",
		"attackDamage",
		"health",
		"armor",
		"magicResist",
		"attackSpeed",
		"movementSpeed",
	] as const

	test.each(["MANA", "ENERGY"])(
		"a %s champion ends with its resource",
		(resource) => {
			expect(keyStats(resource)).toEqual([...fixedStats, "mana"])
		},
	)

	test("a champion without a resource ends with Ability Haste", () => {
		expect(keyStats("NONE", { mana: 0, manaRegen: 0 })).toEqual([
			...fixedStats,
			"abilityHaste",
		])
	})

	test("a resource with no value also ends with Ability Haste", () => {
		expect(keyStats("FRENZY", { mana: 0, manaRegen: 0 })).toEqual([
			...fixedStats,
			"abilityHaste",
		])
	})
})
