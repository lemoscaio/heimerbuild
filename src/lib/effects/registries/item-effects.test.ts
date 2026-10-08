import { describe, expect, test } from "bun:test"
import teemoBin from "../../../../scripts/sync-data/fixtures/champions/Teemo.bin.json"
import teemoDetail from "../../../../scripts/sync-data/fixtures/champions/Teemo.json"
import { normalizeChampion } from "../../../../scripts/sync-data/normalize-champions"
import { computeBuildStats } from "../../stats/compute-build-stats"
import { availableEffects } from "../available-effects"
import { ITEM_EFFECTS } from "./item-effects"

function grantsOf(id: string) {
	return ITEM_EFFECTS.find((effect) => effect.id === id)?.grants
}

// Wiki and CommunityDragon 16.19: the next attack within 10 s of an ability, 1.5 s cooldown.
describe("spellblade items", () => {
	test("follow an ability, last 10 s and come back after 1.5 s", () => {
		const spellblades = ITEM_EFFECTS.filter(({ id }) =>
			id.endsWith("-spellblade"),
		)
		expect(spellblades.map(({ source }) => source)).toEqual([
			{ kind: "item", itemId: "3057" },
			{ kind: "item", itemId: "3078" },
			{ kind: "item", itemId: "3100" },
		])
		for (const effect of spellblades) {
			expect(effect.trigger).toEqual({ kind: "after-ability" })
			expect(effect.duration).toBe(10)
			expect(effect.cooldown).toBe(1.5)
		}
	})

	test("deal 100% (Sheen), 200% (Trinity Force) or 75% base AD + 45% AP (Lich Bane)", () => {
		expect(grantsOf("sheen-spellblade")).toEqual([
			{
				kind: "damage",
				damageType: "physical",
				ratios: { baseAttackDamage: 1 },
			},
		])
		expect(grantsOf("trinity-force-spellblade")).toEqual([
			{
				kind: "damage",
				damageType: "physical",
				ratios: { baseAttackDamage: 2 },
			},
		])
		expect(grantsOf("lich-bane-spellblade")).toEqual([
			{
				kind: "damage",
				damageType: "magic",
				ratios: { baseAttackDamage: 0.75, abilityPower: 0.45 },
			},
			{ kind: "stat", stat: "attackSpeedPercent", amount: 0.5 },
		])
	})
})

// Wiki 2026-10-06: Torment burns for 1% of maximum health every 0.5 s over 3 s (6% in all).
describe("Liandry's Torment", () => {
	test("ability damage burns the target for 6 ticks of 1% of its maximum health over 3 s", () => {
		const burn = ITEM_EFFECTS.find(({ id }) => id === "liandrys-torment-burn")

		expect(burn?.source).toEqual({ kind: "item", itemId: "6653" })
		expect(burn?.trigger).toEqual({ kind: "on-ability-damage" })
		expect(burn?.holder).toBe("target")
		expect(burn?.duration).toBe(3)
		expect(burn?.grants).toEqual([
			{
				kind: "damageOverTime",
				tick: {
					by: "targetHealth",
					damageType: "magic",
					health: "maximum",
					ratio: 0.01,
				},
				every: 0.5,
				firstTick: "delayed",
			},
		])
	})
})

// Wiki 2026-10-07: physical damage to a champion adds a Carve stack for 6 s, up to 5: 6% armor each.
describe("Black Cleaver", () => {
	test("physical damage reduces the target's armor by 6% per stack for 6 s, up to 30% at 5 stacks", () => {
		const carve = ITEM_EFFECTS.find(({ id }) => id === "black-cleaver-carve")

		expect(carve?.source).toEqual({ kind: "item", itemId: "3071" })
		expect(carve?.trigger).toEqual({
			kind: "on-damage",
			damageType: "physical",
		})
		expect(carve?.holder).toBe("target")
		expect(carve?.duration).toBe(6)
		expect(carve?.stacks).toEqual({ max: 5 })
		expect(carve?.grants).toEqual([
			{
				kind: "resistReduction",
				resist: "armor",
				mode: "percent",
				amount: 0.3,
			},
		])
	})
})

// Wiki, checked 2026-10-08 (issue 409): each item's stacks are the build's match stacks.
describe("items with match stacks", () => {
	const PATCH = "16.19.1"
	const teemo = normalizeChampion(teemoDetail, teemoBin, PATCH)
	const ranks = { Q: 0, W: 0, E: 0, R: 0 }

	/** Teemo's totals at level 9 holding the item (its effects, not its stats), with `matchStacks`. */
	function statsWith(
		item: { id: string; name: string },
		matchStacks?: Record<string, number>,
	) {
		const available = availableEffects({
			patch: PATCH,
			champion: teemo,
			ranks,
			spells: [],
			runes: [],
			items: [{ ...item, icon: "" }],
		})
		return computeBuildStats({
			champion: teemo,
			patch: PATCH,
			level: 9,
			items: [],
			shards: [],
			ranks,
			effects: { available, overrides: {} },
			matchStacks,
		})
	}

	const DARK_SEAL = { id: "1082", name: "Dark Seal" }
	const MEJAI = { id: "3041", name: "Mejai's Soulstealer" }
	const HEARTSTEEL = { id: "3084", name: "Heartsteel" }

	test("Dark Seal: 4 ability power per Glory, 10 Glory at most", () => {
		const ap = (count: number) =>
			statsWith(DARK_SEAL, { "dark-seal-stacks": count }).abilityPower.total

		expect(ap(6) - ap(0)).toBe(24)
		expect(ap(25) - ap(0)).toBe(40)
	})

	test("Mejai's Soulstealer: 5 ability power per Glory up to 25, and 10% move speed from 10", () => {
		const stats = (count: number) => statsWith(MEJAI, { "mejai-stacks": count })
		const base = stats(0)

		expect(stats(9).abilityPower.total - base.abilityPower.total).toBe(45)
		expect(stats(9).movementSpeed.total).toBe(base.movementSpeed.total)
		expect(stats(10).movementSpeed.total).toBeGreaterThan(
			base.movementSpeed.total,
		)
		expect(stats(40).abilityPower.total - base.abilityPower.total).toBe(125)
	})

	test("Heartsteel: its permanent bonus health is the count itself", () => {
		const health = (count: number) =>
			statsWith(HEARTSTEEL, { "heartsteel-health": count }).health.bonus

		expect(health(640) - health(0)).toBe(640)
	})
})
