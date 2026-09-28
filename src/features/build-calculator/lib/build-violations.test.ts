import { describe, expect, test } from "bun:test"
import { findBuildViolations } from "./build-violations"

const bootsGroups = [
	{ group: "Boots", max: 1 },
	{ group: "BootsWithoutActives", max: 1 },
]
const items = {
	longSword: { id: "1036", name: "Long Sword", groupLimits: [] },
	berserkers: {
		id: "3006",
		name: "Berserker's Greaves",
		groupLimits: bootsGroups,
	},
	sorcerers: { id: "3020", name: "Sorcerer's Shoes", groupLimits: bootsGroups },
	gunmetal: {
		id: "3172",
		name: "Gunmetal Greaves",
		groupLimits: [
			{ group: "3172", max: 1 },
			{ group: "Boots", max: 1 },
		],
	},
	doransShield: {
		id: "1054",
		name: "Doran's Shield",
		groupLimits: [{ group: "DoransItems", max: 1 }],
	},
	doransBlade: {
		id: "1055",
		name: "Doran's Blade",
		groupLimits: [{ group: "DoransItems", max: 1 }],
	},
	rabadons: {
		id: "3089",
		name: "Rabadon's Deathcap",
		groupLimits: [
			{ group: "3089", max: 1 },
			{ group: "APMultiplier", max: 1 },
		],
	},
	apAmplifier: {
		id: "9001",
		name: "AP Amplifier",
		groupLimits: [{ group: "APMultiplier", max: 1 }],
	},
	ravenous: {
		id: "3074",
		name: "Ravenous Hydra",
		groupLimits: [
			{ group: "{c6428663}", max: 1 },
			{ group: "{8c259571}", max: 3 },
		],
	},
	titanic: {
		id: "3748",
		name: "Titanic Hydra",
		groupLimits: [
			{ group: "{c6428663}", max: 1 },
			{ group: "{8c259571}", max: 3 },
		],
	},
	hydraPart: {
		id: "9002",
		name: "Hydra Part",
		groupLimits: [{ group: "{0321bdeb}", max: 2 }],
	},
}

describe("findBuildViolations", () => {
	test.each([
		{
			case: "two different boots, flagged by two groups",
			build: [items.berserkers, items.longSword, items.sorcerers],
			messages: ["only 1 boots item (Berserker's Greaves, Sorcerer's Shoes)"],
		},
		{
			case: "boots from different boots groups",
			build: [items.gunmetal, items.berserkers],
			messages: ["only 1 boots item (Gunmetal Greaves, Berserker's Greaves)"],
		},
		{
			case: "two Doran's items",
			build: [items.doransShield, items.doransBlade],
			messages: ["only 1 Doran's item (Doran's Shield, Doran's Blade)"],
		},
		{
			case: "the same legendary twice",
			build: [items.rabadons, items.rabadons],
			messages: ["only 1 Rabadon's Deathcap"],
		},
		{
			case: "two different AP multipliers",
			build: [items.rabadons, items.apAmplifier],
			messages: [
				"only 1 AP-multiplier item (Rabadon's Deathcap, AP Amplifier)",
			],
		},
		{
			case: "items of an unnamed group",
			build: [items.ravenous, items.titanic],
			messages: [
				"these items can't be combined (Ravenous Hydra, Titanic Hydra)",
			],
		},
		{
			case: "copies over an unnamed limit above 1",
			build: [
				items.hydraPart,
				items.longSword,
				items.hydraPart,
				items.hydraPart,
			],
			messages: ["only 2 Hydra Part"],
		},
		{
			case: "several broken rules",
			build: [
				items.sorcerers,
				items.rabadons,
				items.berserkers,
				items.rabadons,
			],
			messages: [
				"only 1 boots item (Sorcerer's Shoes, Berserker's Greaves)",
				"only 1 Rabadon's Deathcap",
			],
		},
	])("explains $case", ({ build, messages }) => {
		expect(findBuildViolations(build).map(({ message }) => message)).toEqual([
			...messages,
		])
	})

	test("counts copies in the items it lists", () => {
		const [violation] = findBuildViolations([
			items.berserkers,
			items.berserkers,
			items.sorcerers,
		])
		expect(violation.message).toBe(
			"only 1 boots item (Berserker's Greaves ×2, Sorcerer's Shoes)",
		)
		expect(violation.itemIds).toEqual(["3006", "3006", "3020"])
	})

	test("never shows a hashed group id", () => {
		const violations = findBuildViolations([
			items.ravenous,
			items.titanic,
			items.hydraPart,
			items.hydraPart,
			items.hydraPart,
		])
		expect(violations).toHaveLength(2)
		for (const { message } of violations) expect(message).not.toMatch(/\{/)
	})

	test.each([
		{ case: "an empty build", build: [] },
		{
			case: "items within their limits",
			build: [
				items.longSword,
				items.longSword,
				items.berserkers,
				items.rabadons,
			],
		},
		{
			case: "copies up to a limit above 1",
			build: [items.hydraPart, items.hydraPart],
		},
	])("finds nothing in $case", ({ build }) => {
		expect(findBuildViolations(build)).toEqual([])
	})
})
