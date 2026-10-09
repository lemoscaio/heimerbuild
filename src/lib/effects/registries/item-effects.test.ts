import { describe, expect, test } from "bun:test"
import { championSchema } from "@schemas/champion"
import { ItemsFileSchema } from "@schemas/item"
import teemoBin from "../../../../scripts/sync-data/fixtures/champions/Teemo.bin.json"
import teemoDetail from "../../../../scripts/sync-data/fixtures/champions/Teemo.json"
import { normalizeChampion } from "../../../../scripts/sync-data/normalize-champions"
import {
	type BuildStatsInput,
	computeBuildStats,
	percentBonusBasis,
} from "../../stats/compute-build-stats"
import { availableEffects } from "../available-effects"
import { resolveAmount, resolveGrants } from "../evaluate"
import { usedMatchStacks } from "../match-stacks"
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

// Wiki, checked 2026-10-08 (issue 416): "Magical Opus: Increase your ability power by 30%."
describe("Rabadon's Deathcap", async () => {
	const DATA = new URL("../../../../public/data/", import.meta.url)
	const { currentPatch: PATCH } = await Bun.file(
		new URL("manifest.json", DATA),
	).json()
	const veigar = championSchema.parse(
		await Bun.file(new URL(`${PATCH}/champions/Veigar.json`, DATA)).json(),
	)
	const { items } = ItemsFileSchema.parse(
		await Bun.file(new URL(`${PATCH}/items.json`, DATA)).json(),
	)
	function itemOf(itemId: string) {
		const item = items.find(({ id }) => id === itemId)
		if (!item) throw new Error(`no item ${itemId} in the patch data`)
		return item
	}
	const deathcap = itemOf("3089")
	const ranks = { Q: 0, W: 0, E: 0, R: 0 }

	/** Veigar at level 1 holding Rabadon's Deathcap, its stats and its effects. */
	function input(matchStacks?: Record<string, number>): BuildStatsInput {
		const available = availableEffects({
			patch: PATCH,
			champion: veigar,
			ranks,
			spells: [],
			runes: [],
			items: [deathcap],
		})
		return {
			champion: veigar,
			patch: PATCH,
			level: 1,
			items: [deathcap],
			shards: [],
			ranks,
			effects: { available, overrides: {} },
			matchStacks,
		}
	}

	test("alone at level 1 it gives 169 ability power: its 130 and 30% more", () => {
		expect(deathcap.stats.abilityPower).toBe(130)
		expect(computeBuildStats(input()).abilityPower.total).toBeCloseTo(169)
	})

	test("the 30% includes the match stacks: 100 Phenomenal Evil stacks give (130 + 100) × 1.3", () => {
		const stats = computeBuildStats(input({ "phenomenal-evil": 100 }))

		expect(stats.abilityPower.total).toBeCloseTo((130 + 100) * 1.3)
	})

	test("its row tells the bonus and what it reads: +39 of 130 ability power", () => {
		const build = input()
		const opus = build.effects?.available.find(
			({ id }) => id === "rabadons-deathcap-magical-opus",
		)
		if (!opus) throw new Error("Magical Opus is not in the build")

		expect(
			resolveGrants(opus, {
				level: 1,
				percentBasis: percentBonusBasis(build),
			}),
		).toEqual([
			{
				kind: "stat",
				stat: "abilityPower",
				value: expect.closeTo(39),
				basis: { stat: "abilityPower", ratio: 0.3 },
			},
		])
	})
})

// Wiki, checked 2026-10-09 (issue 414): Manaflow grants up to 360 bonus mana, one count for the three.
describe("Manaflow items", async () => {
	const DATA = new URL("../../../../public/data/", import.meta.url)
	const { currentPatch: PATCH } = await Bun.file(
		new URL("manifest.json", DATA),
	).json()
	async function championOf(key: string) {
		return championSchema.parse(
			await Bun.file(new URL(`${PATCH}/champions/${key}.json`, DATA)).json(),
		)
	}
	const ezreal = await championOf("Ezreal")
	const lux = await championOf("Lux")
	const { items } = ItemsFileSchema.parse(
		await Bun.file(new URL(`${PATCH}/items.json`, DATA)).json(),
	)
	function itemOf(itemId: string) {
		const item = items.find(({ id }) => id === itemId)
		if (!item) throw new Error(`no item ${itemId} in the patch data`)
		return item
	}
	const TEAR = itemOf("3070")
	const MANAMUNE = itemOf("3004")
	const ARCHANGELS = itemOf("3003")
	const DEATHCAP = itemOf("3089")
	const ranks = { Q: 0, W: 0, E: 0, R: 0 }

	/** The champion at level 1 holding `held` (their stats and effects), with `mana` Manaflow mana. */
	function input(
		champion: typeof lux,
		held: (typeof items)[number][],
		mana?: number,
	): BuildStatsInput {
		const available = availableEffects({
			patch: PATCH,
			champion,
			ranks,
			spells: [],
			runes: [],
			items: held,
		})
		return {
			champion,
			patch: PATCH,
			level: 1,
			items: held,
			shards: [],
			ranks,
			effects: { available, overrides: {} },
			matchStacks: mana === undefined ? undefined : { "manaflow-mana": mana },
		}
	}

	test("the items keep the wiki's stats: 240, 500 and 600 mana", () => {
		expect(TEAR.stats).toEqual({ mana: 240 })
		expect(MANAMUNE.stats).toEqual({
			attackDamage: 35,
			mana: 500,
			abilityHaste: 15,
		})
		expect(ARCHANGELS.stats).toEqual({
			abilityPower: 70,
			mana: 600,
			abilityHaste: 25,
		})
	})

	test("Tear of the Goddess: the bonus mana is the count, up to 360", () => {
		const mana = (count?: number) =>
			computeBuildStats(input(lux, [TEAR], count)).mana.total

		expect(mana()).toBe(440 + 240)
		expect(mana(180)).toBe(440 + 240 + 180)
		expect(mana(360)).toBe(440 + 240 + 360)
		expect(mana(500)).toBe(440 + 240 + 360)
	})

	test("Manamune: 2% of maximum mana as bonus attack damage, the stacked mana included", () => {
		const stats = (count?: number) =>
			computeBuildStats(input(ezreal, [MANAMUNE], count))

		expect(stats().mana.total).toBe(375 + 500)
		expect(stats().attackDamage.bonus).toBeCloseTo(35 + 0.02 * 875)
		expect(stats(180).attackDamage.bonus).toBeCloseTo(35 + 0.02 * 1055)
		expect(stats(360).mana.total).toBe(375 + 500 + 360)
		expect(stats(360).attackDamage.bonus).toBeCloseTo(35 + 0.02 * 1235)
	})

	test("Archangel's Staff: 1% of bonus mana as ability power, 6 alone and 9.6 at 360", () => {
		const stats = (count?: number) =>
			computeBuildStats(input(lux, [ARCHANGELS], count))

		expect(stats().abilityPower.total).toBeCloseTo(70 + 6)
		expect(stats(180).abilityPower.total).toBeCloseTo(70 + 7.8)
		expect(stats(360).mana.total).toBe(440 + 600 + 360)
		expect(stats(360).abilityPower.total).toBeCloseTo(70 + 9.6)
	})

	test("with Rabadon's Deathcap, Awe's ability power is in the 30%: (70 + 130 + 9.6) × 1.3", () => {
		const stats = computeBuildStats(input(lux, [ARCHANGELS, DEATHCAP], 360))

		expect(stats.abilityPower.total).toBeCloseTo((70 + 130 + 9.6) * 1.3)
	})

	test("the count stays when Tear becomes Manamune or Archangel's", () => {
		const effectsOf = (held: (typeof items)[number][]) =>
			input(lux, held).effects?.available.map(({ effect }) => effect)
		const stacks = { "manaflow-mana": 240 }

		expect(usedMatchStacks(stacks, effectsOf([TEAR]))).toEqual(stacks)
		expect(usedMatchStacks(stacks, effectsOf([MANAMUNE]))).toEqual(stacks)
		expect(usedMatchStacks(stacks, effectsOf([ARCHANGELS]))).toEqual(stacks)
		expect(usedMatchStacks(stacks, effectsOf([DEATHCAP]))).toBeUndefined()
	})
})

function effectOf(id: string) {
	const effect = ITEM_EFFECTS.find((entry) => entry.id === id)
	if (!effect) throw new Error(`no item effect ${id}`)
	return effect
}

// Wiki, checked 2026-10-09 (issue 418). Their damage is an on-hit effect's, kept off the stats panel.
describe("on-hit items", () => {
	test.each([
		["recurve-bow-sting", "1043", "physical", 15, {}],
		["wits-end-fray", "3091", "magic", 45, {}],
		[
			"nashors-tooth-icathian-bite",
			"3115",
			"magic",
			15,
			{ abilityPower: 0.15 },
		],
		["guinsoos-rageblade-wrath", "3124", "magic", 30, {}],
		[
			"terminus-shadow",
			"3302",
			"magic",
			30,
			{ bonusAttackDamage: 0.1, abilityPower: 0.1 },
		],
	] as const)(
		"%s deals %s's damage on-hit",
		(id, itemId, damageType, base, ratios) => {
			const effect = effectOf(id)

			expect(effect.source).toEqual({ kind: "item", itemId })
			expect(effect.trigger).toEqual({ kind: "on-hit" })
			expect(effect.listed).toBe(false)
			expect(effect.grants).toEqual([
				{ kind: "damage", damageType, base, ratios },
			])
		},
	)

	test("Blade of the Ruined King: 9% (6% ranged) of the target's current health", () => {
		expect(effectOf("blade-of-the-ruined-king-mists-edge").grants).toEqual([
			{
				kind: "damage",
				damageType: "physical",
				ratios: {},
				targetHealth: {
					health: "current",
					ratio: { by: "attackType", melee: 0.09, ranged: 0.06 },
				},
			},
		])
	})

	test("Titanic Hydra: 1% (0.5% ranged) of the user's maximum health", () => {
		expect(effectOf("titanic-hydra-cleave").grants).toEqual([
			{
				kind: "damage",
				damageType: "physical",
				base: {
					by: "stat",
					stat: "health",
					ratio: { by: "attackType", melee: 0.01, ranged: 0.005 },
				},
				ratios: {},
			},
		])
	})

	test("none of them gets a row in the Effects list", () => {
		const PATCH = "16.19.1"
		const teemo = normalizeChampion(teemoDetail, teemoBin, PATCH)
		const ids = ["1043", "3091", "3115", "3124", "3153", "3161", "3302"]
		const available = availableEffects({
			patch: PATCH,
			champion: teemo,
			ranks: { Q: 0, W: 0, E: 0, R: 0 },
			spells: [],
			runes: [],
			items: ids.map((id) => ({ id, name: id, icon: "" })),
		})

		expect(available).toEqual([])
	})
})

// Wiki item data: 150 + 5 × (x − 1) at levels 1 and 9 to 20 (150 to level 8, 200 at 18); ranged × 0.8.
describe("Kraken Slayer's Bring It Down", () => {
	const strike = effectOf("kraken-slayer-bring-it-down")
	const [grant] = strike.grants
	const base = grant?.kind === "damage" ? grant.base : undefined

	function baseAt(level: number, attackType: "melee" | "ranged") {
		if (!base || Array.isArray(base)) throw new Error("no single base")
		const build = { id: strike.id, effect: strike, name: "", icon: "" }
		return resolveAmount(
			base as Exclude<typeof base, readonly unknown[]>,
			build,
			{
				level,
				attackType,
			},
		)
	}

	test("deals 150 to level 8, 155 at 9, 200 at 18 (melee); 120 and 160 ranged", () => {
		expect([1, 8, 9, 18].map((level) => baseAt(level, "melee"))).toEqual([
			150, 150, 155, 200,
		])
		expect(baseAt(1, "ranged")).toBeCloseTo(120)
		expect(baseAt(18, "ranged")).toBeCloseTo(160)
	})

	test("strikes at the third stack, using them up, up to 75% more by missing health", () => {
		const stacks = effectOf("kraken-slayer-stacks")

		expect(stacks).toMatchObject({ duration: 4, stacks: { max: 3 } })
		expect(strike.trigger).toEqual({
			kind: "on-max-stacks",
			effect: "kraken-slayer-stacks",
		})
		expect(strike.consumes).toBe("kraken-slayer-stacks")
		expect(grant).toMatchObject({ missingHealthBonus: 0.75 })
	})
})

// Wiki, checked 2026-10-09: Seething Strike's 4 s is V26.18's, the 7th attack's phantom hit V26.14's.
describe("Guinsoo's Rageblade", () => {
	test("Seething Strike: 8% attack speed per attack for 4 s, up to 32% at 4 stacks", () => {
		expect(effectOf("guinsoos-rageblade-seething-strike")).toMatchObject({
			trigger: { kind: "on-hit", attacksOnly: true },
			duration: 4,
			stacks: { max: 4 },
			grants: [{ kind: "stat", stat: "attackSpeedPercent", amount: 0.32 }],
		})
	})

	test("full, its attacks gather phantom stacks; the third applies on-hit again 0.15 s later", () => {
		expect(effectOf("guinsoos-rageblade-phantom-stacks")).toMatchObject({
			trigger: { kind: "on-hit", attacksOnly: true },
			requiresMaxStacks: "guinsoos-rageblade-seething-strike",
			duration: 4,
			stacks: { max: 3 },
		})
		expect(effectOf("guinsoos-rageblade-phantom-hit")).toMatchObject({
			trigger: {
				kind: "on-max-stacks",
				effect: "guinsoos-rageblade-phantom-stacks",
			},
			consumes: "guinsoos-rageblade-phantom-stacks",
			delay: { seconds: 0.15 },
			grants: [{ kind: "applyOnHit" }],
		})
	})
})

// Wiki, checked 2026-10-09: "3% increased damage" per stack for 6 s, "stacking up to 4 times".
describe("Spear of Shojin's Focused Will", () => {
	test("each ability's damage adds a stack: up to 12% more ability damage", () => {
		expect(effectOf("spear-of-shojin-focused-will")).toMatchObject({
			source: { kind: "item", itemId: "3161" },
			trigger: { kind: "on-action-damage", abilitiesOnly: true },
			duration: 6,
			stacks: { max: 4 },
			grants: [
				{ kind: "damageAmplification", amount: 0.12, abilitiesOnly: true },
			],
		})
	})
})
